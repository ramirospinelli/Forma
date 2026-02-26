import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import { Activity, ActivityType } from "../../lib/types";
import {
  formatDistance,
  formatDuration,
  getActivityColor,
  getActivityEmoji,
  getActivityIcon,
  formatRelativeDate,
  speedToPace,
} from "../../lib/utils";
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadows,
} from "../../constants/theme";
import Header from "../../components/Header";

const ACTIVITY_FILTERS: { label: string; value: ActivityType | "All" }[] = [
  { label: "Todas", value: "All" },
  { label: "🏃 Correr", value: "Run" },
  { label: "🚴 Bici", value: "Ride" },
  { label: "🏊 Nado", value: "Swim" },
  { label: "🚶 Caminar", value: "Walk" },
  { label: "🏋️ Pesas", value: "WeightTraining" },
];

function ActivityCard({
  activity,
  onPress,
}: {
  activity: Activity;
  onPress: () => void;
}) {
  const color = getActivityColor(activity.type);
  const emoji = getActivityEmoji(activity.type);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.typeBadge, { backgroundColor: `${color}15` }]}>
          <Text style={styles.emoji}>{emoji}</Text>
          <Text style={[styles.typeText, { color }]}>
            {activity.type === "Run"
              ? "Carrera"
              : activity.type === "Ride"
                ? "Ciclismo"
                : activity.type}
          </Text>
        </View>
        <Text style={styles.date}>
          {formatRelativeDate(activity.start_date_local)}
        </Text>
      </View>

      <Text style={styles.name} numberOfLines={1}>
        {activity.name}
      </Text>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {formatDistance(activity.distance)}
          </Text>
          <Text style={styles.statLabel}>Distancia</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {formatDuration(activity.moving_time)}
          </Text>
          <Text style={styles.statLabel}>Tiempo</Text>
        </View>
        <View style={styles.divider} />
        {activity.type === "Run" ? (
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {speedToPace(activity.average_speed)}
            </Text>
            <Text style={styles.statLabel}>Ritmo</Text>
          </View>
        ) : (
          <View style={styles.stat}>
            <Text style={styles.statValue}>{activity.tss || 0}</Text>
            <Text style={styles.statLabel}>TSS</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Planned Workout Card ─────────────────────────────────────────────────────
function PlannedWorkoutCard({ workout }: { workout: any }) {
  const color = getActivityColor(workout.activity_type);
  const icon = getActivityIcon(workout.activity_type);

  return (
    <View style={[styles.plannedCard, { borderColor: color + "40" }]}>
      <View style={[styles.plannedIconBg, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <View style={styles.plannedInfo}>
        <View style={styles.plannedHeader}>
          <Text style={styles.plannedLabel}>PRÓXIMO • TRAININGPEAKS</Text>
          <Text style={[styles.plannedType, { color }]}>
            {workout.activity_type}
          </Text>
        </View>
        <Text style={styles.plannedTitle}>{workout.title}</Text>
        <View style={styles.plannedMeta}>
          {workout.planned_duration && (
            <View style={styles.plannedMetaItem}>
              <Ionicons
                name="time-outline"
                size={14}
                color={Colors.textMuted}
              />
              <Text style={styles.plannedMetaText}>
                {Math.round(workout.planned_duration / 60)} min
              </Text>
            </View>
          )}
          {workout.planned_tss && (
            <View style={styles.plannedMetaItem}>
              <Ionicons
                name="flash-outline"
                size={14}
                color={Colors.textMuted}
              />
              <Text style={styles.plannedMetaText}>
                {workout.planned_tss} TSS
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Calendar Component ───────────────────────────────────────────────────────
function Calendar({
  activities,
  plannedWorkouts,
  selectedDate,
  onSelectDate,
}: {
  activities: Activity[];
  plannedWorkouts: any[];
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
}) {
  const weekDays = ["L", "M", "M", "J", "V", "S", "D"];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getDaysInMonth = (month: number, year: number) => {
    const date = new Date(year, month, 1);
    const days = [];
    // Adjust to Monday start
    let firstDay = date.getDay() - 1;
    if (firstDay === -1) firstDay = 6;

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  };

  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();
  const days = getDaysInMonth(currentMonth, currentYear);

  return (
    <View style={styles.calendarContainer}>
      <View style={styles.calendarHeader}>
        <TouchableOpacity
          onPress={() =>
            onSelectDate(new Date(currentYear, currentMonth - 1, 1))
          }
        >
          <Ionicons name="chevron-back" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.calendarMonth}>
          {new Date(currentYear, currentMonth).toLocaleDateString("es-AR", {
            month: "long",
            year: "numeric",
          })}
        </Text>
        <TouchableOpacity
          onPress={() =>
            onSelectDate(new Date(currentYear, currentMonth + 1, 1))
          }
        >
          <Ionicons
            name="chevron-forward"
            size={20}
            color={Colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.calendarGrid}>
        {weekDays.map((day, i) => (
          <Text key={i} style={styles.calendarWeekDay}>
            {day}
          </Text>
        ))}
        {days.map((day, i) => {
          if (!day) return <View key={i} style={styles.calendarDayEmpty} />;

          const isSelected = day.toDateString() === selectedDate.toDateString();
          const isToday = day.toDateString() === today.toDateString();
          const dateStr = day.toISOString().split("T")[0];

          const dayActivities = activities.filter(
            (a) => a.start_date.split("T")[0] === dateStr,
          );
          const dayPlanned = plannedWorkouts.filter(
            (p) => p.planned_date.split("T")[0] === dateStr,
          );

          return (
            <TouchableOpacity
              key={i}
              style={[
                styles.calendarDay,
                isSelected && styles.calendarDaySelected,
                isToday && !isSelected && styles.calendarDayToday,
              ]}
              onPress={() => onSelectDate(day)}
            >
              <Text
                style={[
                  styles.calendarDayText,
                  isSelected && styles.calendarDayTextSelected,
                ]}
              >
                {day.getDate()}
              </Text>
              <View style={styles.calendarDots}>
                {dayActivities.map((a, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.calendarDot,
                      { backgroundColor: getActivityColor(a.type) },
                    ]}
                  />
                ))}
                {dayPlanned.map((p, idx) => (
                  <View
                    key={idx + 10}
                    style={[
                      styles.calendarDot,
                      styles.calendarDotPlanned,
                      { backgroundColor: getActivityColor(p.activity_type) },
                    ]}
                  />
                ))}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function ActivitiesScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [viewMode, setViewMode] = useState<"list" | "calendar">("calendar");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ActivityType | "All">("All");
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["activities", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("user_id", user!.id)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data as Activity[];
    },
    enabled: !!user,
  });

  // Fetch Planned Workouts from Supabase
  const { data: plannedWorkouts = [] } = useQuery({
    queryKey: ["planned_workouts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planned_workouts")
        .select("*")
        .eq("user_id", user!.id)
        .order("planned_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const filteredActivities = activities.filter((a) => {
    const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "All" || a.type === filter;
    return matchesSearch && matchesFilter;
  });

  const selectedDateStr = selectedDate.toISOString().split("T")[0];
  const selectedActivities = activities.filter(
    (a) => a.start_date.split("T")[0] === selectedDateStr,
  );
  const selectedPlanned = plannedWorkouts.filter(
    (p) => p.planned_date.split("T")[0] === selectedDateStr,
  );

  const renderHeaderRight = () => (
    <View style={styles.viewToggle}>
      <TouchableOpacity
        style={[
          styles.toggleBtn,
          viewMode === "calendar" && styles.toggleBtnActive,
        ]}
        onPress={() => setViewMode("calendar")}
      >
        <Ionicons
          name="calendar"
          size={18}
          color={
            viewMode === "calendar" ? Colors.textPrimary : Colors.textMuted
          }
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.toggleBtn,
          viewMode === "list" && styles.toggleBtnActive,
        ]}
        onPress={() => setViewMode("list")}
      >
        <Ionicons
          name="list"
          size={18}
          color={viewMode === "list" ? Colors.textPrimary : Colors.textMuted}
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header title="Mis Actividades" rightElement={renderHeaderRight()} />

      {viewMode === "calendar" ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Calendar
            activities={activities}
            plannedWorkouts={plannedWorkouts}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />

          <View style={styles.dayDetails}>
            <Text style={styles.dayTitle}>
              {selectedDate.toLocaleDateString("es-AR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </Text>

            {selectedPlanned.map((p: any) => (
              <PlannedWorkoutCard key={p.id} workout={p} />
            ))}

            {selectedActivities.length === 0 &&
              selectedPlanned.length === 0 && (
                <View style={styles.emptyDay}>
                  <Ionicons
                    name="calendar-clear-outline"
                    size={40}
                    color={Colors.textMuted}
                  />
                  <Text style={styles.emptyText}>No hay entrenamientos</Text>
                </View>
              )}

            {selectedActivities.map((a) => (
              <ActivityCard
                key={a.id}
                activity={a}
                onPress={() => router.push(`/activity/${a.id}` as any)}
              />
            ))}
          </View>
        </ScrollView>
      ) : (
        <>
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar actividad..."
                placeholderTextColor={Colors.textMuted}
                value={search}
                onChangeText={setSearch}
              />
              {search !== "" && (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={Colors.textMuted}
                  />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={ACTIVITY_FILTERS}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterList}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.filterItem,
                    filter === item.value && styles.filterItemActive,
                  ]}
                  onPress={() => setFilter(item.value)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      filter === item.value && styles.filterTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>

          <FlatList
            data={filteredActivities}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ActivityCard
                activity={item}
                onPress={() => router.push(`/activity/${item.id}` as any)}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons
                  name="search-outline"
                  size={48}
                  color={Colors.textMuted}
                />
                <Text style={styles.emptyTitle}>
                  No se encontraron actividades
                </Text>
                <Text style={styles.emptyText}>
                  Intentá con otros filtros o términos de búsqueda.
                </Text>
              </View>
            }
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  searchContainer: {
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bgCard,
    marginHorizontal: Spacing.lg,
    paddingHorizontal: Spacing.md,
    height: 46,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: FontSize.md,
  },
  filterList: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  filterItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterItemActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.semibold,
  },
  filterTextActive: {
    color: "white",
  },
  listContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
  },
  emoji: { fontSize: 14 },
  typeText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  date: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
  name: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stat: {
    flex: 1,
  },
  statValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: "uppercase",
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 80,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: "center",
  },
  // Toggle Styles
  viewToggle: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: BorderRadius.md,
    padding: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  toggleBtnActive: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  // Calendar Styles
  scrollContent: {
    paddingBottom: 40,
  },
  calendarContainer: {
    backgroundColor: Colors.bgCard,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  calendarMonth: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    textTransform: "capitalize",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarWeekDay: {
    width: `${100 / 7}%`,
    textAlign: "center",
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  calendarDay: {
    width: `${100 / 7}%`,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.md,
  },
  calendarDayEmpty: {
    width: `${100 / 7}%`,
    height: 48,
  },
  calendarDaySelected: {
    backgroundColor: Colors.primary,
  },
  calendarDayToday: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  calendarDayText: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  calendarDayTextSelected: {
    fontWeight: FontWeight.bold,
    color: "white",
  },
  calendarDots: {
    flexDirection: "row",
    gap: 2,
    marginTop: 2,
    height: 4,
  },
  calendarDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  calendarDotPlanned: {
    borderWidth: 1,
    borderColor: Colors.bgCard,
  },
  dayDetails: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  dayTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textTransform: "capitalize",
  },
  emptyDay: {
    alignItems: "center",
    padding: Spacing.xl,
    gap: Spacing.sm,
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 40,
  },
  // Planned card styles
  plannedCard: {
    flexDirection: "row",
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 2,
    borderStyle: "dashed",
    gap: Spacing.md,
    marginBottom: Spacing.xs,
  },
  plannedIconBg: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  plannedInfo: {
    flex: 1,
  },
  plannedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  plannedLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  plannedType: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    textTransform: "uppercase",
  },
  plannedTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginVertical: 4,
  },
  plannedMeta: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  plannedMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  plannedMetaText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
});
