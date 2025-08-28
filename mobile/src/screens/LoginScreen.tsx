import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { AuthService, LoginCredentials, RegisterData } from '../services/AuthService';

const { width, height } = Dimensions.get('window');

const LoginScreen: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  
  // 로그인 폼 상태
  const [loginForm, setLoginForm] = useState<LoginCredentials>({
    email: '',
    password: '',
  });

  // 회원가입 폼 상태
  const [registerForm, setRegisterForm] = useState<RegisterData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // 보안 상태
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleLogin = async () => {
    if (!loginForm.email || !loginForm.password) {
      Alert.alert('오류', '이메일과 비밀번호를 모두 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const response = await AuthService.login(loginForm);
      
      // 로그인 성공시 앱이 자동으로 메인 화면으로 이동
      Alert.alert('환영합니다!', `${response.user.username}님, 로그인이 완료되었습니다.`);
      
    } catch (error: any) {
      Alert.alert('로그인 실패', error.message || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!registerForm.username || !registerForm.email || !registerForm.password || !registerForm.confirmPassword) {
      Alert.alert('오류', '모든 필드를 입력해주세요.');
      return;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      Alert.alert('오류', '비밀번호가 일치하지 않습니다.');
      return;
    }

    if (registerForm.password.length < 8) {
      Alert.alert('오류', '비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    setLoading(true);
    try {
      const response = await AuthService.register(registerForm);
      
      Alert.alert(
        '회원가입 완료!',
        `${response.user.username}님, 환영합니다! 3쿠션 당구 마스터가 되어보세요.`
      );
      
    } catch (error: any) {
      Alert.alert('회원가입 실패', error.message || '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    try {
      // 실제 구현에서는 Google/Apple SDK 사용
      Alert.alert('준비 중', '소셜 로그인 기능을 준비 중입니다.');
    } catch (error: any) {
      Alert.alert('로그인 실패', error.message || '소셜 로그인에 실패했습니다.');
    }
  };

  const handleForgotPassword = async () => {
    if (!loginForm.email) {
      Alert.alert('알림', '먼저 이메일을 입력해주세요.');
      return;
    }

    try {
      await AuthService.requestPasswordReset(loginForm.email);
      Alert.alert('완료', '비밀번호 재설정 링크가 이메일로 전송되었습니다.');
    } catch (error: any) {
      Alert.alert('오류', error.message || '비밀번호 재설정에 실패했습니다.');
    }
  };

  const renderLoginForm = () => (
    <View style={styles.formContainer}>
      <Text style={styles.title}>로그인</Text>
      <Text style={styles.subtitle}>3쿠션 당구 마스터와 함께하세요</Text>

      <View style={styles.inputContainer}>
        <Icon name="email" size={20} color="#666" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="이메일"
          value={loginForm.email}
          onChangeText={(email) => setLoginForm({ ...loginForm, email })}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
      </View>

      <View style={styles.inputContainer}>
        <Icon name="lock" size={20} color="#666" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="비밀번호"
          value={loginForm.password}
          onChangeText={(password) => setLoginForm({ ...loginForm, password })}
          secureTextEntry={!showPassword}
          autoComplete="password"
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={styles.eyeIcon}
        >
          <Icon
            name={showPassword ? 'visibility' : 'visibility-off'}
            size={20}
            color="#666"
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPassword}>
        <Text style={styles.forgotPasswordText}>비밀번호를 잊으셨나요?</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.primaryButton]}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? '로그인 중...' : '로그인'}
        </Text>
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>또는</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.socialContainer}>
        <TouchableOpacity
          style={[styles.socialButton, styles.googleButton]}
          onPress={() => handleSocialLogin('google')}
        >
          <Icon name="android" size={20} color="#fff" />
          <Text style={styles.socialButtonText}>Google</Text>
        </TouchableOpacity>

        {Platform.OS === 'ios' && (
          <TouchableOpacity
            style={[styles.socialButton, styles.appleButton]}
            onPress={() => handleSocialLogin('apple')}
          >
            <Icon name="apple" size={20} color="#fff" />
            <Text style={styles.socialButtonText}>Apple</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        onPress={() => setMode('register')}
        style={styles.switchMode}
      >
        <Text style={styles.switchModeText}>
          계정이 없으신가요? <Text style={styles.linkText}>회원가입</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderRegisterForm = () => (
    <View style={styles.formContainer}>
      <Text style={styles.title}>회원가입</Text>
      <Text style={styles.subtitle}>당구 실력 향상의 첫 걸음</Text>

      <View style={styles.inputContainer}>
        <Icon name="person" size={20} color="#666" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="사용자명"
          value={registerForm.username}
          onChangeText={(username) => setRegisterForm({ ...registerForm, username })}
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputContainer}>
        <Icon name="email" size={20} color="#666" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="이메일"
          value={registerForm.email}
          onChangeText={(email) => setRegisterForm({ ...registerForm, email })}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputContainer}>
        <Icon name="lock" size={20} color="#666" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="비밀번호 (8자 이상)"
          value={registerForm.password}
          onChangeText={(password) => setRegisterForm({ ...registerForm, password })}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={styles.eyeIcon}
        >
          <Icon
            name={showPassword ? 'visibility' : 'visibility-off'}
            size={20}
            color="#666"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <Icon name="lock" size={20} color="#666" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="비밀번호 확인"
          value={registerForm.confirmPassword}
          onChangeText={(confirmPassword) =>
            setRegisterForm({ ...registerForm, confirmPassword })
          }
          secureTextEntry={!showConfirmPassword}
        />
        <TouchableOpacity
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          style={styles.eyeIcon}
        >
          <Icon
            name={showConfirmPassword ? 'visibility' : 'visibility-off'}
            size={20}
            color="#666"
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.button, styles.primaryButton]}
        onPress={handleRegister}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? '가입 중...' : '회원가입'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setMode('login')}
        style={styles.switchMode}
      >
        <Text style={styles.switchModeText}>
          이미 계정이 있으신가요? <Text style={styles.linkText}>로그인</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <LinearGradient colors={['#2E7D32', '#4CAF50']} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* 로고 영역 */}
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Icon name="sports-tennis" size={60} color="#fff" />
            </View>
            <Text style={styles.logoText}>3쿠션 마스터</Text>
            <Text style={styles.logoSubtext}>AI와 함께하는 당구 실력 향상</Text>
          </View>

          {/* 폼 영역 */}
          <View style={styles.formCard}>
            {mode === 'login' ? renderLoginForm() : renderRegisterForm()}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  logoSubtext: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  formContainer: {
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    padding: 4,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#2E7D32',
    fontSize: 14,
  },
  button: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#2E7D32',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    color: '#666',
    paddingHorizontal: 16,
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  googleButton: {
    backgroundColor: '#DB4437',
  },
  appleButton: {
    backgroundColor: '#000',
  },
  socialButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  switchMode: {
    marginTop: 16,
  },
  switchModeText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
  },
  linkText: {
    color: '#2E7D32',
    fontWeight: '600',
  },
});

export default LoginScreen;