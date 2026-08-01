import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { TextField } from '@/components/ui/TextField';
import { Colors } from '@/constants/theme';
import { apiGet, apiPost } from '@/lib/api';
import { ORDER_PRIORITIES, type OrderPriority } from '@/constants/statuses';
import type { ItemType, LaundryService, PriceCell, CustomerListRow } from '@/types/referenceData';

interface OrderLine {
  key: string;
  itemTypeId?: string;
  itemTypeName?: string;
  serviceId: string;
  serviceName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  pricingMode: 'per_item' | 'per_kg';
}

export default function CreateOrderScreen() {
  const router = useRouter();

  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [services, setServices] = useState<LaundryService[]>([]);
  const [pricingMatrix, setPricingMatrix] = useState<PriceCell[]>([]);
  const [isLoadingRefData, setIsLoadingRefData] = useState(true);

  const [customerQuery, setCustomerQuery] = useState('');
  const [customerResults, setCustomerResults] = useState<CustomerListRow[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerListRow | null>(null);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedItemTypeId, setSelectedItemTypeId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');
  const [lines, setLines] = useState<OrderLine[]>([]);

  const [priority, setPriority] = useState<OrderPriority>('normal');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    apiGet<{ itemTypes: ItemType[]; services: LaundryService[]; pricingMatrix: PriceCell[] }>('/api/mobile/reference-data')
      .then(data => {
        setItemTypes(data.itemTypes);
        setServices(data.services);
        setPricingMatrix(data.pricingMatrix);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load pricing.'))
      .finally(() => setIsLoadingRefData(false));
  }, []);

  useEffect(() => {
    if (!customerQuery.trim()) {
      setCustomerResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      apiGet<{ rows: CustomerListRow[] }>(`/api/mobile/customers?q=${encodeURIComponent(customerQuery)}`)
        .then(data => setCustomerResults(data.rows))
        .catch(() => setCustomerResults([]));
    }, 300);
    return () => clearTimeout(timeout);
  }, [customerQuery]);

  const selectedService = services.find(s => s.id === selectedServiceId) ?? null;
  const activeItemTypes = itemTypes.filter(t => t.isActive);
  const activeServices = services.filter(s => s.isActive);

  const priceRange = useMemo(() => {
    if (!selectedService) return null;
    if (selectedService.pricingMode === 'per_kg') {
      if (selectedService.minKgRate === null || selectedService.maxKgRate === null) return null;
      return { min: selectedService.minKgRate, max: selectedService.maxKgRate };
    }
    if (!selectedItemTypeId) return null;
    const cell = pricingMatrix.find(p => p.serviceId === selectedServiceId && p.itemTypeId === selectedItemTypeId);
    if (!cell) return null;
    return { min: cell.minPrice, max: cell.maxPrice };
  }, [selectedService, selectedItemTypeId, pricingMatrix, selectedServiceId]);

  useEffect(() => {
    if (priceRange) setUnitPrice(priceRange.min.toFixed(2));
  }, [priceRange]);

  async function handleCreateCustomer() {
    if (!newFirstName.trim() || !newLastName.trim() || !newPhone.trim()) {
      setError('First name, last name, and phone are required.');
      return;
    }
    setError(null);
    try {
      const data = await apiPost<{ customer: CustomerListRow }>('/api/mobile/customers', {
        firstName: newFirstName.trim(),
        lastName: newLastName.trim(),
        phone: newPhone.trim(),
      });
      setSelectedCustomer(data.customer);
      setShowNewCustomer(false);
      setCustomerQuery('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create customer.');
    }
  }

  function handleAddLine() {
    if (!selectedService) { setError('Choose a service.'); return; }
    if (selectedService.pricingMode === 'per_item' && !selectedItemTypeId) {
      setError('Choose an item type.');
      return;
    }
    if (!priceRange) { setError('No pricing set for this combination.'); return; }

    const qty = parseFloat(quantity);
    const price = parseFloat(unitPrice);
    if (!qty || qty <= 0) { setError('Enter a valid quantity.'); return; }
    if (!price || price < priceRange.min || price > priceRange.max) {
      setError(`Price must be between GHS ${priceRange.min.toFixed(2)} and GHS ${priceRange.max.toFixed(2)}.`);
      return;
    }

    const itemType = activeItemTypes.find(t => t.id === selectedItemTypeId);
    setLines(prev => [...prev, {
      key: `${Date.now()}`,
      itemTypeId: selectedService.pricingMode === 'per_item' ? selectedItemTypeId! : undefined,
      itemTypeName: itemType?.name,
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      quantity: qty,
      unitPrice: price,
      totalPrice: qty * price,
      pricingMode: selectedService.pricingMode,
    }]);
    setError(null);
    setSelectedServiceId(null);
    setSelectedItemTypeId(null);
    setQuantity('1');
    setUnitPrice('');
  }

  function removeLine(key: string) {
    setLines(prev => prev.filter(l => l.key !== key));
  }

  const subtotal = lines.reduce((s, l) => s + l.totalPrice, 0);

  async function handleSubmit() {
    if (!selectedCustomer) { setError('Select a customer.'); return; }
    if (lines.length === 0) { setError('Add at least one item.'); return; }

    setError(null);
    setIsSubmitting(true);
    try {
      const data = await apiPost<{ orderId: string }>('/api/mobile/orders', {
        customerId: selectedCustomer.id,
        priority,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
        items: lines.map(l => ({
          itemTypeId: l.itemTypeId,
          serviceId: l.serviceId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          totalPrice: l.totalPrice,
          pricingMode: l.pricingMode,
        })),
      });
      router.replace(`/orders/${data.orderId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order.');
      setIsSubmitting(false);
    }
  }

  if (isLoadingRefData) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={Colors.brand} />
      </ThemedView>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.background }} contentContainerStyle={styles.container}>
      <Pressable onPress={() => router.back()}>
        <ThemedText themeColor="textSecondary">← Back</ThemedText>
      </Pressable>
      <ThemedText type="title" style={{ color: Colors.brand }}>New order</ThemedText>

      {error && <ErrorBanner message={error} />}

      <Card style={styles.section}>
        <SectionLabel>Customer</SectionLabel>
        {selectedCustomer ? (
          <View style={styles.selectedRow}>
            <ThemedText>{selectedCustomer.firstName} {selectedCustomer.lastName} · {selectedCustomer.phone}</ThemedText>
            <Pressable onPress={() => setSelectedCustomer(null)}>
              <ThemedText themeColor="textSecondary">Change</ThemedText>
            </Pressable>
          </View>
        ) : showNewCustomer ? (
          <View style={{ gap: 8 }}>
            <TextField value={newFirstName} onChangeText={setNewFirstName} placeholder="First name" />
            <TextField value={newLastName} onChangeText={setNewLastName} placeholder="Last name" />
            <TextField value={newPhone} onChangeText={setNewPhone} placeholder="Phone" keyboardType="phone-pad" />
            <Button onPress={handleCreateCustomer}>Create & select</Button>
            <Pressable onPress={() => setShowNewCustomer(false)}>
              <ThemedText themeColor="textSecondary">← Back to search</ThemedText>
            </Pressable>
          </View>
        ) : (
          <>
            <TextField value={customerQuery} onChangeText={setCustomerQuery} placeholder="Search name or phone" />
            {customerResults.map(c => (
              <Pressable
                key={c.id}
                onPress={() => { setSelectedCustomer(c); setCustomerResults([]); }}
                style={styles.listRow}
              >
                <ThemedText type="small">{c.firstName} {c.lastName} · {c.phone}</ThemedText>
              </Pressable>
            ))}
            <Pressable onPress={() => setShowNewCustomer(true)}>
              <ThemedText style={{ color: Colors.brand, fontWeight: '600' }}>+ New customer</ThemedText>
            </Pressable>
          </>
        )}
      </Card>

      <Card style={styles.section}>
        <SectionLabel>Add item</SectionLabel>
        <ThemedText themeColor="textSecondary" type="small">Service</ThemedText>
        <View style={styles.chipRow}>
          {activeServices.map(s => (
            <Chip key={s.id} selected={selectedServiceId === s.id} onPress={() => { setSelectedServiceId(s.id); setSelectedItemTypeId(null); }}>
              {s.name}
            </Chip>
          ))}
        </View>

        {selectedService?.pricingMode === 'per_item' && (
          <>
            <ThemedText themeColor="textSecondary" type="small">Item type</ThemedText>
            <View style={styles.chipRow}>
              {activeItemTypes.map(t => (
                <Chip key={t.id} selected={selectedItemTypeId === t.id} onPress={() => setSelectedItemTypeId(t.id)}>
                  {t.name}
                </Chip>
              ))}
            </View>
          </>
        )}

        {selectedService && priceRange && (
          <View style={styles.row}>
            <TextField
              value={quantity}
              onChangeText={setQuantity}
              placeholder={selectedService.pricingMode === 'per_kg' ? 'Weight (kg)' : 'Quantity'}
              keyboardType="decimal-pad"
              style={{ flex: 1 }}
            />
            <TextField
              value={unitPrice}
              onChangeText={setUnitPrice}
              placeholder={`GHS ${priceRange.min.toFixed(2)}–${priceRange.max.toFixed(2)}`}
              keyboardType="decimal-pad"
              style={{ flex: 1 }}
            />
          </View>
        )}

        <Button variant="secondary" onPress={handleAddLine}>Add item</Button>
      </Card>

      {lines.length > 0 && (
        <Card style={styles.section}>
          <SectionLabel>Items in this order</SectionLabel>
          {lines.map(line => (
            <View key={line.key} style={styles.itemRow}>
              <ThemedText type="small">
                {line.itemTypeName ? `${line.itemTypeName} · ` : ''}{line.serviceName} × {line.quantity}
              </ThemedText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <ThemedText type="small">GHS {line.totalPrice.toFixed(2)}</ThemedText>
                <Pressable onPress={() => removeLine(line.key)}>
                  <ThemedText style={{ color: Colors.error.fg }}>Remove</ThemedText>
                </Pressable>
              </View>
            </View>
          ))}
          <ThemedText style={{ fontWeight: '700', marginTop: 8 }}>Subtotal: GHS {subtotal.toFixed(2)}</ThemedText>
        </Card>
      )}

      <Card style={styles.section}>
        <SectionLabel>Priority</SectionLabel>
        <View style={styles.chipRow}>
          {ORDER_PRIORITIES.map(p => (
            <Chip key={p} selected={priority === p} onPress={() => setPriority(p)}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Chip>
          ))}
        </View>
      </Card>

      <Card style={styles.section}>
        <SectionLabel>Location (optional)</SectionLabel>
        <TextField value={location} onChangeText={setLocation} placeholder="Pickup/delivery address" />
      </Card>

      <Card style={styles.section}>
        <SectionLabel>Notes (optional)</SectionLabel>
        <TextField value={notes} onChangeText={setNotes} placeholder="Any special instructions" />
      </Card>

      <Button onPress={handleSubmit} isPending={isSubmitting} style={styles.submitButton}>
        Create order
      </Button>
    </ScrollView>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <ThemedText themeColor="textSecondary" type="small" style={styles.sectionLabel}>
      {children.toUpperCase()}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop: 60,
    paddingBottom: 48,
    gap: 12,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  listRow: {
    borderWidth: 1,
    borderColor: Colors.backgroundSelected,
    borderRadius: 10,
    padding: 10,
  },
  selectedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  submitButton: {
    marginTop: 8,
  },
});
