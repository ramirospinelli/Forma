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
  speedToPace,
  getActivityColor,
  getActivityEmoji,
  formatRelativeDate,
  getActivityIcon,
} from "../../lib/utils";
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
} from "../../constants/theme";

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
      {/* Top row */}
      <View style={styles.cardTop}>
        <View style={[styles.typeTag, { backgroundColor: `${color}20` }]}>
          <Text style={{ fontSize: 14 }}>{emoji}</Text>
          <Text style={[styles.typeText, { color }]}>{activity.type}</Text>
        </View>
        <Text style={styles.cardDate}>
          {formatRelativeDate(activity.start_date_local)}
        </Text>
      </View>

      {/* Name */}
      <Text style={styles.cardName} numberOfLines={2}>
        {activity.name}
      </Text>

      {/* Stats row */}
      <View style={styles.cardStats}>
        <View style={styles.cardStat}>
          <Text style={[styles.cardStatValue, { color }]}>
            {formatDistance(activity.distance)}
          </Text>
          <Text style={styles.cardStatLabel}>Distancia</Text>
        </View>
        <View style={styles.cardStatDivider} />
        <View style={styles.cardStat}>
          <Text style={styles.cardStatValue}>
            {formatDuration(activity.moving_time)}
          </Text>
          <Text style={styles.cardStatLabel}>Tiempo</Text>
        </View>
        {activity.type === "Run" && (
          <>
            <View style={styles.cardStatDivider} />
            <View style={styles.cardStat}>
              <Text style={styles.cardStatValue}>
                {speedToPace(activity.average_speed)}
              </Text>
              <Text style={styles.cardStatLabel}>Ritmo /km</Text>
            </View>
          </>
        )}
        {activity.total_elevation_gain > 0 && activity.type !== "Run" && (
          <>
            <View style={styles.cardStatDivider} />
            <View style={styles.cardStat}>
              <Text style={styles.cardStatValue}>
                {Math.round(activity.total_elevation_gain)}m
              </Text>
              <Text style={styles.cardStatLabel}>Elevación</Text>
            </View>
          </>
        )}
      </View>

      {/* Heart rate & PRs */}
      {(activity.average_heartrate || (activity.pr_count ?? 0) > 0) && (
        <View style={styles.cardFooter}>
          {activity.average_heartrate && (
            <View style={styles.cardFooterItem}>
              <Ionicons name="heart" size={12} color="#FF5757" />
              <Text style={styles.cardFooterText}>
                {Math.round(activity.average_heartrate)} bpm
              </Text>
            </View>
          )}
          {(activity.pr_count ?? 0) > 0 && (
            <View style={styles.cardFooterItem}>
              <Ionicons name="trophy" size={12} color={Colors.warning} />
              <Text style={styles.cardFooterText}>
                {activity.pr_count} PR{(activity.pr_count ?? 0) > 1 ? "s" : ""}
              </Text>
            </View>
          )}
        </View>
      )}
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
                    key={idx}
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
  const [filter, setFilter] = useState<ActivityType | "All">("All");
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Fetch activities
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

  // Fetch Planned Workouts from Supabase (synced from TrainingPeaks)
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

  const filtered = activities.filter((a) => {
    const matchesFilter = filter === "All" || a.type === filter;
    const matchesSearch =
      !search || a.name.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const selectedDateStr = selectedDate.toISOString().split("T")[0];
  const selectedActivities = activities.filter(
    (a) => a.start_date.split("T")[0] === selectedDateStr,
  );
  const selectedPlanned = plannedWorkouts.filter(
    (p) => p.planned_date.split("T")[0] === selectedDateStr,
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Actividades</Text>
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
                  viewMode === "calendar"
                    ? Colors.textPrimary
                    : Colors.textMuted
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
                color={
                  viewMode === "list" ? Colors.textPrimary : Colors.textMuted
                }
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

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

            {selectedPlanned.map((p) => (
              <PlannedWorkoutCard key={p.id} workout={p} />
            ))}

            {selectedActivities.length === 0 &&
              selectedPlanned.length === 0 && (
                <View style={styles.emptyDay}>
                  <Ionicons
                    name="calendar-clear"
                    size={40}
                    color={Colors.border}
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
          {/* Search & Filters for List view */}
          <View style={styles.searchContainer}>
            <Ionicons
              name="search"
              size={18}
              color={Colors.textMuted}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar actividad..."
              placeholderTextColor={Colors.textMuted}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          <FlatList
            horizontal
            data={ACTIVITY_FILTERS}
            keyExtractor={(i) => i.value}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContainer}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  filter === item.value && styles.filterChipActive,
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

          <FlatList
            data={filtered}
            keyExtractor={(a) => a.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <ActivityCard
                activity={item}
                onPress={() => router.push(`/activity/${item.id}` as any)}
              />
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={{ fontSize: 48 }}>🏃</Text>
                <Text style={styles.emptyTitle}>Sin actividades</Text>
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
  header: {
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    flexDirection: "row",
    alignItems: "baseline",
    gap: Spacing.sm,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extrabold,
    color: Colors.textPrimary,
  },
  count: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    height: 44,
    gap: Spacing.sm,
  },
  searchIcon: {
    marginRight: -4,
  },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    height: "100%",
  },
  filtersContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  filterTextActive: {
    color: Colors.textPrimary,
    fontWeight: FontWeight.bold,
  },
  listContent: {
    padding: Spacing.lg,
    gap: Spacing.sm,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  typeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  typeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardDate: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textTransform: "capitalize",
  },
  cardName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  cardStats: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Spacing.xs,
  },
  cardStat: {
    flex: 1,
    alignItems: "center",
  },
  cardStatValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  cardStatLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  cardStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
  },
  cardFooter: {
    flexDirection: "row",
    gap: Spacing.md,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cardFooterItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cardFooterText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  empty: {
    alignItems: "center",
    padding: Spacing.xxl * 2,
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: "center",
  },
  // Calendar styles
  headerTop: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  viewToggle: {
    flexDirection: "row",
    backgroundColor: Colors.bgCard,
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
    backgroundColor: Colors.bg,
  },
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
    marginBottom: Spacing.lg,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
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
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.sm,
  },
  calendarDayEmpty: {
    width: `${100 / 7}%`,
    height: 44,
  },
  calendarDaySelected: {
    backgroundColor: Colors.primary,
  },
  calendarDayToday: {
    backgroundColor: Colors.border,
  },
  calendarDayText: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  calendarDayTextSelected: {
    fontWeight: FontWeight.bold,
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
    gap: Spacing.sm,
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
  },
  // Planned card
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
