import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/theme';

export default function AdminTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.brand,
        tabBarInactiveTintColor: Colors.textSecondary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Orders', tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="customers/index"
        options={{ title: 'Customers', tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="payments/index"
        options={{ title: 'Payments', tabBarIcon: ({ color, size }) => <Ionicons name="cash-outline" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="more/index"
        options={{ title: 'More', tabBarIcon: ({ color, size }) => <Ionicons name="ellipsis-horizontal-circle-outline" color={color} size={size} /> }}
      />
    </Tabs>
  );
}
