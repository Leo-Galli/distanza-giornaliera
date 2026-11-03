import { Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';

import { Avatar3D } from '../Avatar3D';
import { Avatar, AVATAR_COLORS, AVATAR_SPECIES, GOAL_PRESETS, SPECIES_ICON, SPECIES_LABEL } from '../profile';
import { colors, shade, space } from '../theme';
import { Card, Chip, Icon, Segmented, T } from '../ui';

export function ProfileScreen({
  avatar, onChangeAvatar, goalSteps, onChangeGoal, notificationsEnabled, onToggleNotifications, streak,
}: {
  avatar: Avatar;
  onChangeAvatar: (avatar: Avatar) => void;
  goalSteps: number;
  onChangeGoal: (steps: number) => void;
  notificationsEnabled: boolean;
  onToggleNotifications: (enabled: boolean) => void;
  streak: number;
}) {
  const selectedGoal = GOAL_PRESETS.find((g) => g.steps === goalSteps)?.key ?? GOAL_PRESETS[2].key;

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <View style={[styles.avatarPreview, { borderColor: avatar.color }]}>
        <Avatar3D species={avatar.species} color={avatar.color} size={134} />
      </View>
      <TextInput
        value={avatar.name}
        onChangeText={(name) => onChangeAvatar({ ...avatar, name })}
        placeholder="Il tuo nome"
        placeholderTextColor={colors.muted}
        maxLength={20}
        style={styles.nameInput}
      />
      <Chip text={`Serie attuale: ${streak} ${streak === 1 ? 'giorno' : 'giorni'}`} color={colors.red} icon="fire" />

      <Card style={{ width: '100%' }}>
        <T v="h2">Scegli il tuo avatar</T>
        <View style={{ height: space.sm }} />
        <View style={styles.grid}>
          {AVATAR_SPECIES.map((species) => {
            const selected = species === avatar.species;
            return (
              <Pressable
                key={species}
                accessibilityRole="button"
                accessibilityLabel={SPECIES_LABEL[species]}
                onPress={() => onChangeAvatar({ ...avatar, species })}
                style={styles.speciesCell}
              >
                <View
                  style={[
                    styles.iconCell,
                    { borderColor: selected ? avatar.color : colors.border, backgroundColor: selected ? `${avatar.color}22` : colors.card },
                  ]}
                >
                  <Icon name={SPECIES_ICON[species]} size={26} color={selected ? shade(avatar.color, -0.15) : colors.muted} />
                </View>
                <T v="label" style={{ fontSize: 11 }} color={selected ? avatar.color : colors.muted}>{SPECIES_LABEL[species]}</T>
              </Pressable>
            );
          })}
        </View>
        <View style={{ height: space.sm }} />
        <View style={styles.row}>
          {AVATAR_COLORS.map((color) => (
            <Pressable
              key={color}
              accessibilityRole="button"
              accessibilityLabel={`colore ${color}`}
              onPress={() => onChangeAvatar({ ...avatar, color })}
              style={[styles.swatch, { backgroundColor: color, borderColor: color === avatar.color ? colors.text : 'transparent' }]}
            />
          ))}
        </View>
      </Card>

      <Card style={{ width: '100%' }}>
        <T v="h2">Obiettivo giornaliero</T>
        <View style={{ height: space.sm }} />
        <Segmented
          options={GOAL_PRESETS.map((g) => ({ key: g.key, label: g.label }))}
          value={selectedGoal}
          onChange={(key) => {
            const preset = GOAL_PRESETS.find((g) => g.key === key);
            if (preset) onChangeGoal(preset.steps);
          }}
        />
        <View style={{ height: space.xs }} />
        <T v="label" style={{ textAlign: 'center' }}>{goalSteps.toLocaleString('it-IT')} passi al giorno</T>
      </Card>

      <Card style={{ width: '100%' }}>
        <View style={styles.notifRow}>
          <View style={{ flex: 1 }}>
            <T v="h2">Promemoria giornaliero</T>
            <T v="label">Una notifica alle 20:00 se non hai ancora camminato oggi.</T>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={onToggleNotifications}
            trackColor={{ true: colors.lime, false: colors.border }}
            thumbColor="#fff"
          />
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.lg, gap: space.md, alignItems: 'center', paddingBottom: space.xl },
  avatarPreview: {
    width: 142, height: 142, borderRadius: 71, borderWidth: 4, alignItems: 'center', justifyContent: 'center',
    marginTop: space.sm, padding: 4, backgroundColor: colors.card,
  },
  nameInput: {
    fontFamily: 'LilitaOne_400Regular', fontSize: 20, color: colors.text, textAlign: 'center',
    borderBottomWidth: 2, borderBottomColor: colors.border, paddingVertical: 4, minWidth: 180,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  speciesCell: { alignItems: 'center', gap: 2, width: 64 },
  iconCell: {
    width: 52, height: 52, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },
  row: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  swatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 3 },
  notifRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, width: '100%' },
});
