import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { PostInputType } from '@workspace/api-client-react';
import { useAppSafeAreaInsets } from './AppSafeAreaView';
import { useColors } from '../hooks/useColors';
import { useSync } from '../context/SyncContext';
import { Button } from './Button';

type ComposePostModalProps = {
  visible: boolean;
  onClose: () => void;
};

const postTypes: Array<{
  value: PostInputType;
  label: string;
  icon: keyof typeof Feather.glyphMap;
}> = [
  { value: 'UPDATE', label: 'Atualização', icon: 'book-open' },
  { value: 'PRAYER_REQUEST', label: 'Oração', icon: 'heart' },
  { value: 'NEED', label: 'Necessidade', icon: 'package' },
];

export function ComposePostModal({
  visible,
  onClose,
}: ComposePostModalProps) {
  const colors = useColors();
  const insets = useAppSafeAreaInsets();
  const { enqueueCreatePost } = useSync();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<PostInputType>('PRAYER_REQUEST');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetAndClose = () => {
    setTitle('');
    setContent('');
    setType('PRAYER_REQUEST');
    onClose();
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;
    setIsSubmitting(true);
    try {
      await enqueueCreatePost(title.trim(), content.trim(), type);
      resetAndClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={resetAndClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={resetAndClose}
          accessibilityLabel="Fechar nova publicação"
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardArea}
        >
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.card,
                paddingBottom: Math.max(insets.bottom, 20),
              },
            ]}
          >
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <View style={styles.header}>
              <View>
                <Text style={[styles.eyebrow, { color: colors.accent }]}>
                  COMPARTILHAR
                </Text>
                <Text style={[styles.title, { color: colors.foreground }]}>
                  Nova publicação
                </Text>
              </View>
              <Button
                variant="ghost"
                icon="x"
                size="sm"
                onPress={resetAndClose}
                accessibilityLabel="Fechar"
              />
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.form}
            >
              <Text style={[styles.label, { color: colors.foreground }]}>
                O que você deseja compartilhar?
              </Text>
              <View style={styles.typeSelector}>
                {postTypes.map((item) => {
                  const selected = type === item.value;
                  return (
                    <Pressable
                      key={item.value}
                      onPress={() => setType(item.value)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      style={({ pressed }) => [
                        styles.typeButton,
                        {
                          backgroundColor: selected
                            ? item.value === 'PRAYER_REQUEST'
                              ? colors.accent
                              : colors.primary
                            : colors.background,
                          borderColor: selected
                            ? 'transparent'
                            : colors.border,
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      <Feather
                        name={item.icon}
                        size={19}
                        color={
                          selected
                            ? colors.primaryForeground
                            : item.value === 'PRAYER_REQUEST'
                              ? colors.accent
                              : colors.primary
                        }
                      />
                      <Text
                        style={[
                          styles.typeText,
                          {
                            color: selected
                              ? colors.primaryForeground
                              : colors.foreground,
                          },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
                  Título
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.foreground,
                      backgroundColor: colors.background,
                      borderColor: colors.input,
                    },
                  ]}
                  placeholder="Dê um título à publicação"
                  placeholderTextColor={colors.mutedForeground}
                  value={title}
                  onChangeText={setTitle}
                  maxLength={100}
                  accessibilityLabel="Título da publicação"
                />
              </View>

              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
                  Mensagem
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.contentInput,
                    {
                      color: colors.foreground,
                      backgroundColor: colors.background,
                      borderColor: colors.input,
                    },
                  ]}
                  placeholder="Conte o que está acontecendo..."
                  placeholderTextColor={colors.mutedForeground}
                  value={content}
                  onChangeText={setContent}
                  multiline
                  textAlignVertical="top"
                  accessibilityLabel="Conteúdo da publicação"
                />
              </View>

              <Button
                title="Salvar publicação"
                icon="check"
                fullWidth
                onPress={handleSubmit}
                disabled={!title.trim() || !content.trim() || isSubmitting}
                loading={isSubmitting}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(34, 29, 25, 0.42)',
  },
  keyboardArea: {
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '92%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.4,
    fontFamily: 'Inter_700Bold',
    marginBottom: 3,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
  },
  form: {
    padding: 20,
    paddingTop: 8,
    gap: 20,
  },
  label: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    minHeight: 72,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 6,
  },
  typeText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  field: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  contentInput: {
    minHeight: 132,
    lineHeight: 23,
  },
});