import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { 
  t, 
  changeLanguage, 
  getCurrentLanguage, 
  getSupportedLanguages, 
  SupportedLanguage, 
  LanguageConfig 
} from '../services/i18n';
import { UserPreferences, NotificationSettings, DisplaySettings, PrivacySettings } from '../types';
import { APIService } from '../services/APIService';

const SettingsScreen: React.FC = () => {
  const [preferences, setPreferences] = useState<UserPreferences>({
    language: getCurrentLanguage(),
    notifications: {
      practiceReminders: true,
      challengeUpdates: true,
      socialUpdates: true,
      marketing: false,
    },
    display: {
      theme: 'auto',
      tableStyle: 'classic',
      showTrajectoryAnimation: true,
      showDifficultyNumbers: true,
    },
    privacy: {
      profileVisibility: 'public',
      showRealName: false,
      showStats: true,
      allowFriendRequests: true,
    },
  });

  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUserPreferences();
  }, []);

  const loadUserPreferences = async () => {
    try {
      const response = await APIService.get<UserPreferences>('/user/preferences');
      if (response.data) {
        setPreferences(response.data);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const savePreferences = async (newPreferences: UserPreferences) => {
    try {
      setLoading(true);
      const response = await APIService.put('/user/preferences', newPreferences);
      
      if (response.success) {
        setPreferences(newPreferences);
      } else {
        Alert.alert(t('common.error'), t('settings.saveError'));
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
      Alert.alert(t('common.error'), t('settings.saveError'));
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = async (language: SupportedLanguage) => {
    const success = await changeLanguage(language);
    if (success) {
      const newPreferences = { ...preferences, language };
      await savePreferences(newPreferences);
      setShowLanguagePicker(false);
    }
  };

  const updateNotificationSettings = (key: keyof NotificationSettings, value: boolean) => {
    const newPreferences = {
      ...preferences,
      notifications: {
        ...preferences.notifications,
        [key]: value,
      },
    };
    savePreferences(newPreferences);
  };

  const updateDisplaySettings = (key: keyof DisplaySettings, value: any) => {
    const newPreferences = {
      ...preferences,
      display: {
        ...preferences.display,
        [key]: value,
      },
    };
    savePreferences(newPreferences);
  };

  const updatePrivacySettings = (key: keyof PrivacySettings, value: any) => {
    const newPreferences = {
      ...preferences,
      privacy: {
        ...preferences.privacy,
        [key]: value,
      },
    };
    savePreferences(newPreferences);
  };

  const renderSectionHeader = (title: string, icon: string) => (
    <View style={styles.sectionHeader}>
      <Icon name={icon} size={24} color="#2E7D32" />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  const renderSettingItem = (
    title: string,
    subtitle?: string,
    rightComponent?: React.ReactNode,
    onPress?: () => void
  ) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.settingLeft}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {rightComponent && (
        <View style={styles.settingRight}>
          {rightComponent}
        </View>
      )}
      {onPress && (
        <Icon name="chevron-right" size={24} color="#ccc" style={styles.chevronIcon} />
      )}
    </TouchableOpacity>
  );

  const renderSwitchItem = (
    title: string,
    subtitle: string,
    value: boolean,
    onValueChange: (value: boolean) => void
  ) => {
    return renderSettingItem(
      title,
      subtitle,
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#ccc', true: '#4CAF50' }}
        thumbColor={value ? '#2E7D32' : '#f4f3f4'}
      />
    );
  };

  const renderLanguagePicker = () => {
    const languages = getSupportedLanguages();
    
    return (
      <Modal
        visible={showLanguagePicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowLanguagePicker(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('settings.language')}</Text>
              <TouchableOpacity
                onPress={() => setShowLanguagePicker(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={languages}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.languageItem,
                    preferences.language === item.code && styles.selectedLanguageItem,
                  ]}
                  onPress={() => handleLanguageChange(item.code)}
                >
                  <Text style={styles.languageFlag}>{item.flag}</Text>
                  <View style={styles.languageInfo}>
                    <Text style={styles.languageName}>{item.nativeName}</Text>
                    <Text style={styles.languageEnglishName}>{item.name}</Text>
                  </View>
                  {preferences.language === item.code && (
                    <Icon name="check" size={24} color="#2E7D32" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    );
  };

  const getCurrentLanguageConfig = () => {
    return getSupportedLanguages().find(lang => lang.code === preferences.language);
  };

  return (
    <ScrollView style={styles.container}>
      {/* 언어 설정 */}
      {renderSectionHeader(t('settings.language'), 'language')}
      <View style={styles.section}>
        {renderSettingItem(
          t('settings.language'),
          getCurrentLanguageConfig()?.nativeName,
          <Text style={styles.currentLanguage}>
            {getCurrentLanguageConfig()?.flag}
          </Text>,
          () => setShowLanguagePicker(true)
        )}
      </View>

      {/* 알림 설정 */}
      {renderSectionHeader(t('settings.notifications'), 'notifications')}
      <View style={styles.section}>
        {renderSwitchItem(
          t('settings.practiceReminders'),
          '연습 시간을 알려드립니다',
          preferences.notifications.practiceReminders,
          (value) => updateNotificationSettings('practiceReminders', value)
        )}
        {renderSwitchItem(
          t('settings.challengeUpdates'),
          '새로운 도전과제 업데이트',
          preferences.notifications.challengeUpdates,
          (value) => updateNotificationSettings('challengeUpdates', value)
        )}
        {renderSwitchItem(
          t('settings.socialUpdates'),
          '친구 활동 및 순위 변동',
          preferences.notifications.socialUpdates,
          (value) => updateNotificationSettings('socialUpdates', value)
        )}
        {renderSwitchItem(
          t('settings.marketing'),
          '프로모션 및 마케팅 정보',
          preferences.notifications.marketing,
          (value) => updateNotificationSettings('marketing', value)
        )}
      </View>

      {/* 디스플레이 설정 */}
      {renderSectionHeader(t('settings.display'), 'display-settings')}
      <View style={styles.section}>
        {renderSettingItem(
          t('settings.theme'),
          preferences.display.theme === 'light' ? t('settings.light') :
          preferences.display.theme === 'dark' ? t('settings.dark') : t('settings.auto'),
          undefined,
          () => {
            const themes: Array<'light' | 'dark' | 'auto'> = ['light', 'dark', 'auto'];
            const currentIndex = themes.indexOf(preferences.display.theme);
            const nextTheme = themes[(currentIndex + 1) % themes.length];
            updateDisplaySettings('theme', nextTheme);
          }
        )}
        {renderSwitchItem(
          '궤적 애니메이션 표시',
          '공의 이동 경로를 애니메이션으로 표시',
          preferences.display.showTrajectoryAnimation,
          (value) => updateDisplaySettings('showTrajectoryAnimation', value)
        )}
        {renderSwitchItem(
          '난이도 숫자 표시',
          '경로의 난이도를 숫자로 표시',
          preferences.display.showDifficultyNumbers,
          (value) => updateDisplaySettings('showDifficultyNumbers', value)
        )}
      </View>

      {/* 개인정보 설정 */}
      {renderSectionHeader(t('settings.privacy'), 'privacy-tip')}
      <View style={styles.section}>
        {renderSettingItem(
          t('settings.profileVisibility'),
          preferences.privacy.profileVisibility === 'public' ? t('settings.public') :
          preferences.privacy.profileVisibility === 'friendsOnly' ? t('settings.friendsOnly') : 
          t('settings.private'),
          undefined,
          () => {
            const visibility: Array<'public' | 'friendsOnly' | 'private'> = ['public', 'friendsOnly', 'private'];
            const currentIndex = visibility.indexOf(preferences.privacy.profileVisibility);
            const nextVisibility = visibility[(currentIndex + 1) % visibility.length];
            updatePrivacySettings('profileVisibility', nextVisibility);
          }
        )}
        {renderSwitchItem(
          t('settings.showRealName'),
          '프로필에 실명을 표시합니다',
          preferences.privacy.showRealName,
          (value) => updatePrivacySettings('showRealName', value)
        )}
        {renderSwitchItem(
          t('settings.showStats'),
          '다른 사용자에게 통계를 공개합니다',
          preferences.privacy.showStats,
          (value) => updatePrivacySettings('showStats', value)
        )}
        {renderSwitchItem(
          t('settings.allowFriendRequests'),
          '다른 사용자의 친구 요청을 받습니다',
          preferences.privacy.allowFriendRequests,
          (value) => updatePrivacySettings('allowFriendRequests', value)
        )}
      </View>

      {/* 기타 설정 */}
      {renderSectionHeader('기타', 'more-horiz')}
      <View style={styles.section}>
        {renderSettingItem(
          '데이터 초기화',
          '모든 로컬 데이터를 삭제합니다',
          undefined,
          () => {
            Alert.alert(
              '데이터 초기화',
              '정말로 모든 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
              [
                { text: t('common.cancel'), style: 'cancel' },
                { 
                  text: '초기화', 
                  style: 'destructive',
                  onPress: () => {
                    // 데이터 초기화 로직 구현
                    Alert.alert('알림', '데이터 초기화 기능을 준비 중입니다.');
                  }
                },
              ]
            );
          }
        )}
        {renderSettingItem(
          '캐시 삭제',
          '임시 파일과 캐시를 삭제합니다',
          undefined,
          () => {
            // 캐시 삭제 로직 구현
            Alert.alert('완료', '캐시가 삭제되었습니다.');
          }
        )}
        {renderSettingItem(
          '앱 정보',
          'Version 1.0.0 (Phase 3)',
          undefined,
          () => {
            Alert.alert(
              '3쿠션 당구 마스터',
              'Version 1.0.0 (Phase 3)\n\nAI와 함께하는 당구 실력 향상\n\n© 2024 Billiard3Cushion Team'
            );
          }
        )}
      </View>

      {renderLanguagePicker()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 12,
  },
  section: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLeft: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  settingRight: {
    marginRight: 8,
  },
  chevronIcon: {
    marginLeft: 8,
  },
  currentLanguage: {
    fontSize: 24,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxHeight: '70%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedLanguageItem: {
    backgroundColor: '#E8F5E8',
  },
  languageFlag: {
    fontSize: 32,
    marginRight: 16,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  languageEnglishName: {
    fontSize: 14,
    color: '#666',
  },
});

export default SettingsScreen;