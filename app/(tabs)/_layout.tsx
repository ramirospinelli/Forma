import { Tabs } from "expo-router";
import { View, StyleSheet, Platform, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Colors,
  BorderRadius,
  Shadows,
  FontWeight,
} from "../../constants/theme";

function TabIcon({
  name,
  focused,
  label,
}: {
  name: string;
  focused: boolean;
  label: string;
}) {
  return (
    <View style={styles.tabItem}>
      <View style={[styles.iconContainer, focused && styles.iconFocused]}>
        <Ionicons
          name={name as any}
          size={20}
          color={focused ? Colors.primary : Colors.textMuted}
        />
      </View>
      <Text
        style={[
          styles.tabLabel,
          { color: focused ? Colors.primary : Colors.textMuted },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={focused ? "home" : "home-outline"}
              focused={focused}
              label="Inicio"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="activities"
        options={{
          title: "Actividades",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={focused ? "flash" : "flash-outline"}
              focused={focused}
              label="Actividades"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: "Análisis",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={focused ? "analytics" : "analytics-outline"}
              focused={focused}
              label="Análisis"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={focused ? "person" : "person-outline"}
              focused={focused}
              label="Perfil"
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor:
      Platform.OS === "web" ? "rgba(18, 18, 26, 0.95)" : Colors.bgCard,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: Platform.OS === "ios" ? 88 : 70,
    paddingBottom: Platform.OS === "ios" ? 28 : 12,
    paddingTop: 12,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 8,
    ...Shadows.lg,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minWidth: 70,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.2,
  },
  iconContainer: {
    width: 48,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.md,
  },
  iconFocused: {
    backgroundColor: "rgba(255, 107, 53, 0.1)",
  },
});
