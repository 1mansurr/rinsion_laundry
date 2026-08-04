import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/theme';
import { FAQS } from '@/constants/faq';

export default function AccountFaqScreen() {
  const router = useRouter();
  const [open, setOpen] = useState<Record<number, boolean>>({});

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.background }} contentContainerStyle={styles.container}>
      <Pressable onPress={() => router.back()}>
        <ThemedText themeColor="textSecondary">← Back</ThemedText>
      </Pressable>
      <ThemedText type="title" style={{ color: Colors.brand, fontSize: 32, lineHeight: 38 }}>
        Frequently Asked Questions
      </ThemedText>

      <Card style={{ gap: 0 }}>
        {FAQS.map((f, i) => (
          <View key={f.q} style={i > 0 ? styles.rowBorder : undefined}>
            <Pressable onPress={() => setOpen(s => ({ ...s, [i]: !s[i] }))} style={styles.question}>
              <ThemedText style={{ fontWeight: '600', flex: 1 }}>{f.q}</ThemedText>
              <ThemedText style={{ color: Colors.clay }}>{open[i] ? '–' : '+'}</ThemedText>
            </Pressable>
            {open[i] && (
              <ThemedText themeColor="textSecondary" type="small" style={styles.answer}>
                {f.a}
              </ThemedText>
            )}
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop: 60,
    paddingBottom: 48,
    gap: 16,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.backgroundSelected,
  },
  question: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  answer: {
    paddingBottom: 14,
  },
});
