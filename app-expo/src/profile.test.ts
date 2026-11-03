import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_PROFILE, loadProfile, Profile, saveProfile } from './profile';

describe('profile store', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('restituisce il profilo di default se non c e nulla salvato', async () => {
    expect(await loadProfile()).toEqual(DEFAULT_PROFILE);
  });

  it('salva e ricarica un profilo personalizzato', async () => {
    const custom: Profile = {
      avatar: { icon: 'robot-happy', color: '#2DB7A5', name: 'Robo' },
      goalSteps: 15000,
      notificationsEnabled: true,
    };
    await saveProfile(custom);
    expect(await loadProfile()).toEqual(custom);
  });

  it('torna al default se i dati salvati sono corrotti', async () => {
    await AsyncStorage.setItem('distanza-giornaliera:profile', JSON.stringify({ avatar: { icon: 'x' } }));
    expect(await loadProfile()).toEqual(DEFAULT_PROFILE);
  });
});
