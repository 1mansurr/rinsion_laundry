import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
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
  const theme = useTheme();
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
        <ActivityIndicator />
      </ThemedView>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={styles.container}>
      <Pressable onPress={() => router.back()}>
        <ThemedText themeColor="textSecondary">← Back</ThemedText>
      </Pressable>
      <ThemedText type="title">New order</ThemedText>

      {error && <ThemedText style={styles.error}>{error}</ThemedText>}

      <Section label="Customer">
        {selectedCustomer ? (
          <View style={styles.selectedRow}>
            <ThemedText>{selectedCustomer.firstName} {selectedCustomer.lastName} · {selectedCustomer.phone}</ThemedText>
            <Pressable onPress={() => setSelectedCustomer(null)}>
              <ThemedText themeColor="textSecondary">Change</ThemedText>
            </Pressable>
          </View>
        ) : showNewCustomer ? (
          <View style={{ gap: 8 }}>
            <TextInput
              value={newFirstName}
              onChangeText={setNewFirstName}
              placeholder="First name"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
            />
            <TextInput
              value={newLastName}
              onChangeText={setNewLastName}
              placeholder="Last name"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
            />
            <TextInput
              value={newPhone}
              onChangeText={setNewPhone}
              placeholder="Phone"
              placeholderTextColor={theme.textSecondary}
              keyboardType="phone-pad"
              style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
            />
            <Pressable onPress={handleCreateCustomer} style={styles.button}>
              <ThemedText style={styles.buttonText}>Create & select</ThemedText>
            </Pressable>
            <Pressable onPress={() => setShowNewCustomer(false)}>
              <ThemedText themeColor="textSecondary">← Back to search</ThemedText>
            </Pressable>
          </View>
        ) : (
          <>
            <TextInput
              value={customerQuery}
              onChangeText={setCustomerQuery}
              placeholder="Search name or phone"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
            />
            {customerResults.map(c => (
              <Pressable
                key={c.id}
                onPress={() => { setSelectedCustomer(c); setCustomerResults([]); }}
                style={[styles.listRow, { borderColor: theme.backgroundSelected }]}
              >
                <ThemedText type="small">{c.firstName} {c.lastName} · {c.phone}</ThemedText>
              </Pressable>
            ))}
            <Pressable onPress={() => setShowNewCustomer(true)}>
              <ThemedText themeColor="textSecondary">+ New customer</ThemedText>
            </Pressable>
          </>
        )}
      </Section>

      <Section label="Add item">
        <ThemedText themeColor="textSecondary" type="small">Service</ThemedText>
        <View style={styles.chipRow}>
          {activeServices.map(s => (
            <Pressable
              key={s.id}
              onPress={() => { setSelectedServiceId(s.id); setSelectedItemTypeId(null); }}
              style={[styles.chip, { borderColor: theme.backgroundSelected }, selectedServiceId === s.id && { backgroundColor: theme.backgroundSelected }]}
            >
              <ThemedText type="small">{s.name}</ThemedText>
            </Pressable>
          ))}
        </View>

        {selectedService?.pricingMode === 'per_item' && (
          <>
            <ThemedText themeColor="textSecondary" type="small">Item type</ThemedText>
            <View style={styles.chipRow}>
              {activeItemTypes.map(t => (
                <Pressable
                  key={t.id}
                  onPress={() => setSelectedItemTypeId(t.id)}
                  style={[styles.chip, { borderColor: theme.backgroundSelected }, selectedItemTypeId === t.id && { backgroundColor: theme.backgroundSelected }]}
                >
                  <ThemedText type="small">{t.name}</ThemedText>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {selectedService && priceRange && (
          <View style={styles.row}>
            <TextInput
              value={quantity}
              onChangeText={setQuantity}
              placeholder={selectedService.pricingMode === 'per_kg' ? 'Weight (kg)' : 'Quantity'}
              placeholderTextColor={theme.textSecondary}
              keyboardType="decimal-pad"
              style={[styles.input, { flex: 1, color: theme.text, borderColor: theme.backgroundSelected }]}
            />
            <TextInput
              value={unitPrice}
              onChangeText={setUnitPrice}
              placeholder={`GHS ${priceRange.min.toFixed(2)}–${priceRange.max.toFixed(2)}`}
              placeholderTextColor={theme.textSecondary}
              keyboardType="decimal-pad"
              style={[styles.input, { flex: 1, color: theme.text, borderColor: theme.backgroundSelected }]}
            />
          </View>
        )}

        <Pressable onPress={handleAddLine} style={styles.button}>
          <ThemedText style={styles.buttonText}>Add item</ThemedText>
        </Pressable>
      </Section>

      {lines.length > 0 && (
        <Section label="Items in this order">
          {lines.map(line => (
            <View key={line.key} style={styles.itemRow}>
              <ThemedText type="small">
                {line.itemTypeName ? `${line.itemTypeName} · ` : ''}{line.serviceName} × {line.quantity}
              </ThemedText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <ThemedText type="small">GHS {line.totalPrice.toFixed(2)}</ThemedText>
                <Pressable onPress={() => removeLine(line.key)}>
                  <ThemedText style={{ color: '#B91C1C' }}>Remove</ThemedText>
                </Pressable>
              </View>
            </View>
          ))}
          <ThemedText style={{ fontWeight: '700', marginTop: 8 }}>Subtotal: GHS {subtotal.toFixed(2)}</ThemedText>
        </Section>
      )}

      <Section label="Priority">
        <View style={styles.chipRow}>
          {ORDER_PRIORITIES.map(p => (
            <Pressable
              key={p}
              onPress={() => setPriority(p)}
              style={[styles.chip, { borderColor: theme.backgroundSelected }, priority === p && { backgroundColor: theme.backgroundSelected }]}
            >
              <ThemedText type="small" style={{ textTransform: 'capitalize' }}>{p}</ThemedText>
            </Pressable>
          ))}
        </View>
      </Section>

      <Section label="Location (optional)">
        <TextInput
          value={location}
          onChangeText={setLocation}
          placeholder="Pickup/delivery address"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
        />
      </Section>

      <Section label="Notes (optional)">
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Any special instructions"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
        />
      </Section>

      <Pressable onPress={handleSubmit} disabled={isSubmitting} style={[styles.button, styles.submitButton, { opacity: isSubmitting ? 0.6 : 1 }]}>
        <ThemedText style={styles.buttonText}>{isSubmitting ? 'Creating…' : 'Create order'}</ThemedText>
      </Pressable>
    </ScrollView>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText themeColor="textSecondary" type="small" style={styles.sectionLabel}>
        {label.toUpperCase()}
      </ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop: 60,
    paddingBottom: 48,
    gap: 8,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginTop: 16,
    gap: 8,
  },
  sectionLabel: {
    letterSpacing: 0.5,
  },
  error: {
    color: '#B91C1C',
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
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
  chip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  listRow: {
    borderWidth: 1,
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
  button: {
    backgroundColor: '#2F6B4F',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  submitButton: {
    marginTop: 24,
  },
  buttonText: {
    color: '#FAF8F5',
    fontWeight: '600',
  },
});
