import React from 'react';
import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/hooks/useAuth';
import { toUserMessage } from '@/services/auth.service';

type RegisterFormData = {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
};

function validateRegisterForm(data: RegisterFormData): string | null {
  if (!data.name.trim()) return '이름을 입력해주세요.';
  if (!data.email.trim()) return '이메일을 입력해주세요.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    return '유효한 이메일 형식이 아닙니다.';
  }
  if (data.password.length < 6) return '비밀번호는 6자 이상이어야 합니다.';

  // 하이픈 제거 후 검증
  const digits = data.phoneNumber.replace(/-/g, '');
  if (!/^01[0-9]{8,9}$/.test(digits)) {
    return '유효한 휴대폰 번호를 입력해주세요. (예: 01012345678)';
  }
  return null;
}

export default function RegisterScreen(): React.JSX.Element {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameInputRef = useRef<TextInput>(null);
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const phoneInputRef = useRef<TextInput>(null);

  const handleRegister = async (): Promise<void> => {
    const validationError = validateRegisterForm({ name, email, password, phoneNumber });
    if (validationError) {
      setError(validationError);
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);
    setError('');

    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        phoneNumber: phoneNumber.replace(/-/g, ''),
      });
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>회원가입</Text>
            <Text style={styles.subtitle}>출퇴근 메이트에 가입하세요</Text>
          </View>

          {error ? (
            <View
              style={styles.errorContainer}
              accessible
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
            >
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <Text style={styles.label}>이름</Text>
            <TextInput
              ref={nameInputRef}
              style={styles.input}
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (error) setError('');
              }}
              placeholder="이름을 입력해주세요"
              autoCapitalize="words"
              autoFocus
              editable={!isSubmitting}
              accessibilityLabel="이름"
              returnKeyType="next"
              onSubmitEditing={() => emailInputRef.current?.focus()}
            />

            <Text style={styles.label}>이메일</Text>
            <TextInput
              ref={emailInputRef}
              style={styles.input}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) setError('');
              }}
              placeholder="이메일을 입력해주세요"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSubmitting}
              accessibilityLabel="이메일"
              returnKeyType="next"
              onSubmitEditing={() => passwordInputRef.current?.focus()}
            />

            <Text style={styles.label}>비밀번호</Text>
            <TextInput
              ref={passwordInputRef}
              style={styles.input}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (error) setError('');
              }}
              placeholder="6자 이상 입력해주세요"
              secureTextEntry
              autoCapitalize="none"
              maxLength={72}
              editable={!isSubmitting}
              accessibilityLabel="비밀번호"
              returnKeyType="next"
              onSubmitEditing={() => phoneInputRef.current?.focus()}
            />

            <Text style={styles.label}>전화번호</Text>
            <TextInput
              ref={phoneInputRef}
              style={styles.input}
              value={phoneNumber}
              onChangeText={(text) => {
                setPhoneNumber(text);
                if (error) setError('');
              }}
              placeholder="01012345678"
              keyboardType="phone-pad"
              maxLength={13}
              editable={!isSubmitting}
              accessibilityLabel="전화번호"
              returnKeyType="go"
              onSubmitEditing={() => void handleRegister()}
            />

            <Pressable
              style={[styles.button, isSubmitting && styles.buttonDisabled]}
              onPress={() => void handleRegister()}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="회원가입"
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>회원가입</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>이미 계정이 있으신가요? </Text>
            <Link href="/(auth)/login" asChild>
              <Pressable accessibilityRole="link">
                <Text style={styles.linkText}>로그인</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
  },
  form: {
    gap: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  button: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
  },
  linkText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
});
