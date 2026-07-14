import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth } from "../../../config/firebase";
import { supabase } from "../../../config/supabase";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const JOB_STATUSES_ON_CALENDAR = [
  "accepted", "en_route", "arrived", "in_progress", "payment_pending", "completed", "rescheduled",
];

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

export default function TechScheduleScreen() {
  const router = useRouter();
  const [monthCursor, setMonthCursor] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [jobs, setJobs] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [blocksUnavailable, setBlocksUnavailable] = useState(false);

  // Reschedule modal
  const [rescheduleJob, setRescheduleJob] = useState<any>(null);
  const [newDateTime, setNewDateTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  // Add/edit personal block modal
  const [blockModalVisible, setBlockModalVisible] = useState(false);
  const [editingBlock, setEditingBlock] = useState<any>(null);
  const [blockTitle, setBlockTitle] = useState("");
  const [blockStart, setBlockStart] = useState(new Date());
  const [blockEnd, setBlockEnd] = useState(new Date());
  const [showBlockStartPicker, setShowBlockStartPicker] = useState(false);
  const [showBlockEndPicker, setShowBlockEndPicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchMonthData();
    }, [monthCursor]),
  );

  const fetchMonthData = async () => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const start = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
    const end = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1);

    const [jobsRes, blocksRes] = await Promise.all([
      supabase
        .from("bookings")
        .select(
          "id, service_title, location_address, scheduled_date, status, estimated_cost, customer:customer_id(first_name, last_name)",
        )
        .eq("technician_id", user.uid)
        .in("status", JOB_STATUSES_ON_CALENDAR)
        .gte("scheduled_date", start.toISOString())
        .lt("scheduled_date", end.toISOString()),
      supabase
        .from("tech_schedule_blocks")
        .select("*")
        .eq("technician_id", user.uid)
        .gte("start_time", start.toISOString())
        .lt("start_time", end.toISOString()),
    ]);

    if (jobsRes.error) console.error("Fetch jobs error:", jobsRes.error.message);

    if (blocksRes.error) {
      // 42P01 = table not found yet, 42501 = RLS/permission denied.
      // Either way, this feature just isn't set up in the database yet —
      // don't spam the console, just hide the feature gracefully.
      if (blocksRes.error.code === "42P01" || blocksRes.error.code === "42501") {
        setBlocksUnavailable(true);
      } else {
        console.error("Fetch blocks error:", blocksRes.error.message);
      }
    } else {
      setBlocksUnavailable(false);
    }

    setJobs(jobsRes.data ?? []);
    setBlocks(blocksRes.data ?? []);
    setLoading(false);
  };

  // ---- Calendar grid ----
  const buildGrid = () => {
    const firstOfMonth = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
    const startWeekday = firstOfMonth.getDay();
    const daysInMonth = new Date(
      monthCursor.getFullYear(),
      monthCursor.getMonth() + 1,
      0,
    ).getDate();

    const cells: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(monthCursor.getFullYear(), monthCursor.getMonth(), d));
    }
    return cells;
  };

  const jobsForDate = (d: Date) =>
    jobs.filter((j) => j.scheduled_date && isSameDay(new Date(j.scheduled_date), d));
  const blocksForDate = (d: Date) =>
    blocks.filter((b) => b.start_time && isSameDay(new Date(b.start_time), d));

  const changeMonth = (delta: number) => {
    setMonthCursor(
      new Date(monthCursor.getFullYear(), monthCursor.getMonth() + delta, 1),
    );
  };

  // ---- Reschedule ----
  const openReschedule = (job: any) => {
    setRescheduleJob(job);
    setNewDateTime(job.scheduled_date ? new Date(job.scheduled_date) : new Date());
  };

  const saveReschedule = async () => {
    if (!rescheduleJob) return;
    setSaving(true);
    const { error } = await supabase
      .from("bookings")
      .update({
        scheduled_date: newDateTime.toISOString(),
        status: "rescheduled",
      })
      .eq("id", rescheduleJob.id);
    setSaving(false);

    if (error) {
      if (error.code === "22P02" || /invalid input value for enum/i.test(error.message)) {
        Alert.alert(
          "Setup needed",
          "The 'rescheduled' status isn't enabled in the database yet. Ask your admin to run the database setup (see SETUP.sql), then try again.",
        );
      } else {
        Alert.alert("Error", error.message);
      }
      return;
    }
    setRescheduleJob(null);
    fetchMonthData();
    Alert.alert(
      "Rescheduled",
      "The appointment has moved to your Rescheduled tab in Jobs Center. Confirm it there once the new time is set to resume it.",
    );
  };

  const cancelJob = (job: any) => {
    Alert.alert(
      "Cancel Appointment",
      `Cancel the ${job.service_title || "service"} appointment with ${
        job.customer?.first_name || "this client"
      }?`,
      [
        { text: "Keep It", style: "cancel" },
        {
          text: "Cancel Appointment",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("bookings")
              .update({ status: "cancelled" })
              .eq("id", job.id);
            if (error) {
              Alert.alert("Error", error.message);
            } else {
              fetchMonthData();
            }
          },
        },
      ],
    );
  };

  // ---- Personal blocks (time off / manual appointments) ----
  const openAddBlock = () => {
    if (blocksUnavailable) {
      Alert.alert(
        "Not available yet",
        "Personal schedule blocks aren't set up on this account yet. Ask your admin to run the database setup (see SETUP.sql), then try again.",
      );
      return;
    }
    setEditingBlock(null);
    setBlockTitle("");
    const base = new Date(selectedDate);
    base.setHours(9, 0, 0, 0);
    setBlockStart(base);
    const endBase = new Date(base);
    endBase.setHours(base.getHours() + 1);
    setBlockEnd(endBase);
    setBlockModalVisible(true);
  };

  const openEditBlock = (block: any) => {
    setEditingBlock(block);
    setBlockTitle(block.title);
    setBlockStart(new Date(block.start_time));
    setBlockEnd(new Date(block.end_time));
    setBlockModalVisible(true);
  };

  const saveBlock = async () => {
    if (!blockTitle.trim()) {
      Alert.alert("Missing title", "Give this schedule item a short title.");
      return;
    }
    const user = auth.currentUser;
    if (!user) return;

    setSaving(true);
    let error;
    if (editingBlock) {
      ({ error } = await supabase
        .from("tech_schedule_blocks")
        .update({
          title: blockTitle.trim(),
          start_time: blockStart.toISOString(),
          end_time: blockEnd.toISOString(),
        })
        .eq("id", editingBlock.id));
    } else {
      ({ error } = await supabase.from("tech_schedule_blocks").insert({
        technician_id: user.uid,
        title: blockTitle.trim(),
        start_time: blockStart.toISOString(),
        end_time: blockEnd.toISOString(),
      }));
    }
    setSaving(false);

    if (error) {
      Alert.alert(
        "Error",
        error.code === "42P01"
          ? "The schedule_blocks table hasn't been created yet. See the setup note from your developer."
          : error.message,
      );
      return;
    }
    setBlockModalVisible(false);
    fetchMonthData();
  };

  const deleteBlock = (block: any) => {
    Alert.alert("Remove Item", `Remove "${block.title}" from your schedule?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("tech_schedule_blocks")
            .delete()
            .eq("id", block.id);
          if (error) {
            Alert.alert("Error", error.message);
          } else {
            fetchMonthData();
          }
        },
      },
    ]);
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "#10B981";
      case "payment_pending": return "#F97316";
      case "rescheduled": return "#8B5CF6";
      default: return "#3B82F6";
    }
  };

  const grid = buildGrid();
  const selectedDayJobs = jobsForDate(selectedDate);
  const selectedDayBlocks = blocksForDate(selectedDate);
  const today = new Date();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0D0D" />

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Schedule & Shifts</Text>
          <Text style={styles.sub}>Manage your appointments and hours</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAddBlock}>
          <Ionicons name="add" size={22} color="#000000" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Month navigator */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>
            {MONTH_NAMES[monthCursor.getMonth()]} {monthCursor.getFullYear()}
          </Text>
          <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Weekday row */}
        <View style={styles.weekRow}>
          {WEEKDAYS.map((w, i) => (
            <Text key={i} style={styles.weekDayText}>{w}</Text>
          ))}
        </View>

        {/* Calendar grid */}
        {loading ? (
          <ActivityIndicator color="#FFFFFF" style={{ marginTop: 30 }} />
        ) : (
          <View style={styles.grid}>
            {grid.map((d, idx) => {
              if (!d) return <View key={idx} style={styles.cell} />;
              const dJobs = jobsForDate(d);
              const dBlocks = blocksForDate(d);
              const isSelected = isSameDay(d, selectedDate);
              const isToday = isSameDay(d, today);
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.cell,
                    isSelected && styles.cellSelected,
                    isToday && !isSelected && styles.cellToday,
                  ]}
                  onPress={() => setSelectedDate(d)}
                >
                  <Text
                    style={[
                      styles.cellText,
                      isSelected && styles.cellTextSelected,
                    ]}
                  >
                    {d.getDate()}
                  </Text>
                  <View style={styles.dotRow}>
                    {dJobs.slice(0, 3).map((j, i2) => (
                      <View
                        key={i2}
                        style={[
                          styles.dot,
                          { backgroundColor: getStatusColor(j.status) },
                        ]}
                      />
                    ))}
                    {dBlocks.length > 0 && (
                      <View style={[styles.dot, { backgroundColor: "#8B5CF6" }]} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Selected day agenda */}
        <View style={styles.agenda}>
          <Text style={styles.agendaTitle}>
            {selectedDate.toLocaleDateString("en-PH", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </Text>

          {selectedDayJobs.length === 0 && selectedDayBlocks.length === 0 ? (
            <View style={styles.emptyAgenda}>
              <Ionicons name="calendar-clear-outline" size={32} color="#333333" />
              <Text style={styles.emptyAgendaText}>Nothing scheduled this day</Text>
              <TouchableOpacity style={styles.addBlockLink} onPress={openAddBlock}>
                <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" />
                <Text style={styles.addBlockLinkText}>Add to schedule</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {selectedDayJobs
                .sort(
                  (a, b) =>
                    new Date(a.scheduled_date).getTime() -
                    new Date(b.scheduled_date).getTime(),
                )
                .map((job) => (
                  <View key={job.id} style={styles.agendaCard}>
                    <View
                      style={[
                        styles.agendaStripe,
                        { backgroundColor: getStatusColor(job.status) },
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      <View style={styles.agendaCardTop}>
                        <Text style={styles.agendaTime}>
                          {formatTime(new Date(job.scheduled_date))}
                        </Text>
                        <Text
                          style={[
                            styles.agendaStatus,
                            { color: getStatusColor(job.status) },
                          ]}
                        >
                          {job.status.replace("_", " ").toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.agendaService}>
                        {job.service_title || "Service Appointment"}
                      </Text>
                      <Text style={styles.agendaCustomer}>
                        {job.customer
                          ? `${job.customer.first_name} ${job.customer.last_name}`
                          : "Client"}
                      </Text>
                      {job.location_address && (
                        <Text style={styles.agendaAddress} numberOfLines={1}>
                          {job.location_address}
                        </Text>
                      )}

                      {job.status !== "completed" && (
                        <View style={styles.agendaActions}>
                          <TouchableOpacity
                            style={styles.agendaActionBtn}
                            onPress={() => openReschedule(job)}
                          >
                            <Ionicons name="time-outline" size={14} color="#FFFFFF" />
                            <Text style={styles.agendaActionText}>Reschedule</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.agendaActionBtn, styles.agendaActionDanger]}
                            onPress={() => cancelJob(job)}
                          >
                            <Ionicons name="close-circle-outline" size={14} color="#EF4444" />
                            <Text style={[styles.agendaActionText, { color: "#EF4444" }]}>
                              Cancel
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.agendaActionBtn}
                            onPress={() =>
                              router.push({
                                pathname: "/(technician)/track-job",
                                params: { id: job.id },
                              } as any)
                            }
                          >
                            <Ionicons name="navigate-outline" size={14} color="#FFFFFF" />
                            <Text style={styles.agendaActionText}>Open</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                ))}

              {selectedDayBlocks.map((block) => (
                <TouchableOpacity
                  key={block.id}
                  style={styles.blockCard}
                  onPress={() => openEditBlock(block)}
                >
                  <View style={[styles.agendaStripe, { backgroundColor: "#8B5CF6" }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.agendaTime}>
                      {formatTime(new Date(block.start_time))} –{" "}
                      {formatTime(new Date(block.end_time))}
                    </Text>
                    <Text style={styles.agendaService}>{block.title}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.blockDeleteBtn}
                    onPress={() => deleteBlock(block)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </>
          )}
        </View>
      </ScrollView>

      {/* RESCHEDULE MODAL */}
      <Modal visible={!!rescheduleJob} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reschedule Appointment</Text>
            <Text style={styles.modalSub}>
              {rescheduleJob?.service_title} —{" "}
              {rescheduleJob?.customer
                ? `${rescheduleJob.customer.first_name} ${rescheduleJob.customer.last_name}`
                : "Client"}
            </Text>

            <TouchableOpacity
              style={styles.pickerRow}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={16} color="#AAAAAA" />
              <Text style={styles.pickerRowText}>
                {newDateTime.toLocaleDateString("en-PH", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pickerRow}
              onPress={() => setShowTimePicker(true)}
            >
              <Ionicons name="time-outline" size={16} color="#AAAAAA" />
              <Text style={styles.pickerRowText}>{formatTime(newDateTime)}</Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={newDateTime}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                minimumDate={new Date()}
                onChange={(_, d) => {
                  setShowDatePicker(Platform.OS === "ios");
                  if (d) {
                    const combined = new Date(newDateTime);
                    combined.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
                    setNewDateTime(combined);
                  }
                }}
              />
            )}
            {showTimePicker && (
              <DateTimePicker
                value={newDateTime}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(_, d) => {
                  setShowTimePicker(Platform.OS === "ios");
                  if (d) {
                    const combined = new Date(newDateTime);
                    combined.setHours(d.getHours(), d.getMinutes());
                    setNewDateTime(combined);
                  }
                }}
              />
            )}

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setRescheduleJob(null)}
              >
                <Text style={styles.cancelBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={saveReschedule}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#000000" />
                ) : (
                  <Text style={styles.submitBtnText}>Save New Time</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ADD/EDIT BLOCK MODAL */}
      <Modal visible={blockModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingBlock ? "Edit Schedule Item" : "Add to Schedule"}
            </Text>
            <Text style={styles.modalSub}>
              Block off time — e.g. shop hours, personal errands, days off.
            </Text>

            <Text style={styles.inputLabel}>Title</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Out for lunch"
              placeholderTextColor="#555555"
              value={blockTitle}
              onChangeText={setBlockTitle}
            />

            <TouchableOpacity
              style={styles.pickerRow}
              onPress={() => setShowBlockStartPicker(true)}
            >
              <Ionicons name="time-outline" size={16} color="#AAAAAA" />
              <Text style={styles.pickerRowText}>
                Starts {formatTime(blockStart)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.pickerRow}
              onPress={() => setShowBlockEndPicker(true)}
            >
              <Ionicons name="time-outline" size={16} color="#AAAAAA" />
              <Text style={styles.pickerRowText}>Ends {formatTime(blockEnd)}</Text>
            </TouchableOpacity>

            {showBlockStartPicker && (
              <DateTimePicker
                value={blockStart}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(_, d) => {
                  setShowBlockStartPicker(Platform.OS === "ios");
                  if (d) {
                    const combined = new Date(selectedDate);
                    combined.setHours(d.getHours(), d.getMinutes(), 0, 0);
                    setBlockStart(combined);
                  }
                }}
              />
            )}
            {showBlockEndPicker && (
              <DateTimePicker
                value={blockEnd}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(_, d) => {
                  setShowBlockEndPicker(Platform.OS === "ios");
                  if (d) {
                    const combined = new Date(selectedDate);
                    combined.setHours(d.getHours(), d.getMinutes(), 0, 0);
                    setBlockEnd(combined);
                  }
                }}
              />
            )}

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setBlockModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={saveBlock}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#000000" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {editingBlock ? "Save Changes" : "Add"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1A1A1A",
  },
  title: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  sub: { color: "#888888", fontSize: 12, marginTop: 2 },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#262626",
    alignItems: "center",
    justifyContent: "center",
  },
  monthLabel: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  weekRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 4,
  },
  weekDayText: {
    flex: 1,
    textAlign: "center",
    color: "#555555",
    fontSize: 11,
    fontWeight: "700",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 14,
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 2,
  },
  cellSelected: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
  },
  cellToday: {
    borderWidth: 1,
    borderColor: "#3B82F6",
    borderRadius: 12,
  },
  cellText: { color: "#DDDDDD", fontSize: 13, fontWeight: "600" },
  cellTextSelected: { color: "#000000", fontWeight: "800" },
  dotRow: { flexDirection: "row", gap: 2, marginTop: 3, height: 5 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  agenda: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 60 },
  agendaTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 12,
  },
  emptyAgenda: {
    alignItems: "center",
    paddingVertical: 30,
    backgroundColor: "#121212",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222222",
    gap: 6,
  },
  emptyAgendaText: { color: "#666666", fontSize: 12 },
  addBlockLink: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  addBlockLinkText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  agendaCard: {
    flexDirection: "row",
    backgroundColor: "#121212",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#222222",
    marginBottom: 10,
    overflow: "hidden",
  },
  blockCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#121212",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#222222",
    marginBottom: 10,
    overflow: "hidden",
    paddingRight: 12,
  },
  agendaStripe: { width: 4, alignSelf: "stretch" },
  agendaCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  agendaTime: { color: "#FFFFFF", fontSize: 12, fontWeight: "800", paddingHorizontal: 14, paddingTop: 12 },
  agendaStatus: { fontSize: 9, fontWeight: "800" },
  agendaService: { color: "#FFFFFF", fontSize: 14, fontWeight: "700", paddingHorizontal: 14, marginTop: 2 },
  agendaCustomer: { color: "#AAAAAA", fontSize: 12, paddingHorizontal: 14, marginTop: 2 },
  agendaAddress: { color: "#777777", fontSize: 11, paddingHorizontal: 14, marginTop: 2 },
  agendaActions: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  agendaActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#1A1A1A",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  agendaActionDanger: { backgroundColor: "#1F1212" },
  agendaActionText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  blockDeleteBtn: { padding: 6 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: "#111111",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222222",
    padding: 20,
  },
  modalTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "800" },
  modalSub: { color: "#888888", fontSize: 12, marginTop: 4, marginBottom: 16 },
  inputLabel: { color: "#AAAAAA", fontSize: 11, fontWeight: "700", marginBottom: 6 },
  textInput: {
    backgroundColor: "#1E1E1E",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333333",
    color: "#FFFFFF",
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 14,
    fontSize: 14,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1E1E1E",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333333",
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 10,
  },
  pickerRowText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  modalActionRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#222222",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  submitBtn: {
    flex: 2,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: { color: "#000000", fontWeight: "800", fontSize: 13 },
});
