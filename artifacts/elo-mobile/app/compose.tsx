import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useColors } from '../hooks/useColors';
import { Button } from '../components/Button';
import { useSync } from '../context/SyncContext';
import { useRouter } from 'expo-router';
import { PostInputType } from '@workspace/api-client-react';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ComposeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { enqueueCreatePost } = useSync();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<PostInputType>('PRAYER_REQUEST');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;
    setIsSubmitting(true);
    await enqueueCreatePost(title.trim(), content.trim(), type);
    setIsSubmitting(false);
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Button variant="ghost" icon="x" size="sm" onPress={() => router.back()} />
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Nova Publicação</Text>
        <Button 
          title="Publicar" 
          size="sm" 
          onPress={handleSubmit} 
          disabled={!title.trim() || !content.trim() || isSubmitting}
          loading={isSubmitting}
        />
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.form} contentContainerStyle={{ gap: 16 }}>
          <View style={styles.typeSelector}>
            {(['UPDATE', 'PRAYER_REQUEST', 'NEED'] as PostInputType[]).map((t) => (
              <Button
                key={t}
                title={t === 'UPDATE' ? 'Atualização' : t === 'PRAYER_REQUEST' ? 'Oração' : 'Necessidade'}
                variant={type === t ? (t === 'PRAYER_REQUEST' ? 'wine' : 'primary') : 'outline'}
                size="sm"
                onPress={() => setType(t)}
                style={{ flex: 1 }}
              />
            ))}
          </View>

          <TextInput
            style={[styles.titleInput, { color: colors.foreground }]}
            placeholder="Título..."
            placeholderTextColor={colors.mutedForeground}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
          
          <TextInput
            style={[styles.contentInput, { color: colors.foreground }]}
            placeholder="O que você quer compartilhar?"
            placeholderTextColor={colors.mutedForeground}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  form: {
    flex: 1,
    padding: 16,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  titleInput: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    paddingVertical: 8,
  },
  contentInput: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    minHeight: 200,
    lineHeight: 24,
  },
});
