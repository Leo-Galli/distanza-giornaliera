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
      avatar: { species: 'robot', color: '#2DB7A5', name: 'Robo' },
      goalSteps: 15000,
      notificationsEnabled: true,
    };
    await saveProfile(custom);
    expect(await loadProfile()).toEqual(custom);
  });

  it('torna al default se i dati salvati sono corrotti', async () => {
    await AsyncStorage.setItem('distanza-giornaliera:profile', JSON.stringify({ avatar: { species: 'x' } }));
    expect(await loadProfile()).toEqual(DEFAULT_PROFILE);
  });

  it('torna al default se la specie non esiste piu', async () => {
    await AsyncStorage.setItem(
      'distanza-giornaliera:profile',
      JSON.stringify({ avatar: { species: 'turtle', color: '#fff', name: 'X' }, goalSteps: 8000, notificationsEnabled: false })
    );
    expect(await loadProfile()).toEqual(DEFAULT_PROFILE);
  });
});
