import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '../components/Ionicons';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import Header from '../components/Header';
import { bridgeService } from '../services/bridgeService';

const QUICK_COMMANDS = [
  { label: 'Masaüstü', icon: 'folder-outline', cmd: 'Get-ChildItem "$HOME\\Desktop" | Select-Object Name, Length | Format-Table -AutoSize' },
  { label: 'IP & Ağ', icon: 'wifi-outline', cmd: 'Get-NetIPAddress -AddressFamily IPv4 | Select-Object InterfaceAlias, IPAddress' },
  { label: 'Disk', icon: 'disc-outline', cmd: 'Get-PSDrive C | Select-Object @{N="UsedGB";E={[math]::Round($_.Used/1GB,1)}}, @{N="FreeGB";E={[math]::Round($_.Free/1GB,1)}}' },
  { label: 'Pil', icon: 'battery-charging-outline', cmd: 'Get-CimInstance Win32_Battery | Select-Object Name, EstimatedChargeRemaining' },
];

export default function TerminalScreen() {
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState('PS C:\\Users\\omar> # Laptop PowerShell Terminali Hazır');
  const [running, setRunning] = useState(false);
  const [processes, setProcesses] = useState([]);
  const [loadingProcs, setLoadingProcs] = useState(false);

  const loadProcesses = async () => {
    setLoadingProcs(true);
    const res = await bridgeService.getProcesses();
    if (res && res.ok && Array.isArray(res.processes)) {
      setProcesses(res.processes);
    }
    setLoadingProcs(false);
  };

  useEffect(() => {
    loadProcesses();
  }, []);

  const handleRunCommand = async (cmdToRun) => {
    const finalCmd = cmdToRun || command;
    if (!finalCmd || !finalCmd.trim()) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}

    setRunning(true);
    const res = await bridgeService.execPowerShell(finalCmd.trim());
    const resultText = res.output || res.error || '(Komut tamamlandı, çıktı yok)';
    setOutput(`PS C:\\Users\\omar> ${finalCmd.trim()}\n\n${resultText}`);
    if (!cmdToRun) setCommand('');
    setRunning(false);
  };

  const handleKillProcess = async (pid, name) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}
    const res = await bridgeService.sendAction('kill_process', pid);
    setOutput(`PS C:\\Users\\omar> Stop-Process -Id ${pid} (${name})\n${res.output || res.error}`);
    loadProcesses();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Header
        subtitle="PowerShell & Görev Yöneticisi"
        title="Terminal & Süreçler"
        rightElement={
          <TouchableOpacity style={styles.refreshBtn} onPress={loadProcesses}>
            <Ionicons name="refresh-outline" size={14} color={colors.primaryLight} style={{ marginRight: 4 }} />
            <Text style={styles.refreshBtnText}>Yenile</Text>
          </TouchableOpacity>
        }
      />

      {/* POWERSHELL CONSOLE CARD */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Canlı PowerShell Konsolu</Text>
          <View style={styles.badgeShell}>
            <Text style={styles.badgeShellText}>PS 7.x / 5.1</Text>
          </View>
        </View>

        {/* QUICK COMMAND CHIPS */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {QUICK_COMMANDS.map((q) => (
            <TouchableOpacity
              key={q.label}
              style={styles.chip}
              onPress={() => handleRunCommand(q.cmd)}
              activeOpacity={0.7}
            >
              <Ionicons name={q.icon} size={14} color={colors.primaryLight} style={{ marginRight: 6 }} />
              <Text style={styles.chipText}>{q.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.cmdInput}
            placeholder="PowerShell komutu girin..."
            placeholderTextColor={colors.textMuted}
            value={command}
            onChangeText={setCommand}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.runBtn}
            onPress={() => handleRunCommand()}
            disabled={running}
            activeOpacity={0.8}
          >
            {running ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="play" size={14} color="#FFF" style={{ marginRight: 4 }} />
                <Text style={styles.runBtnText}>Çalıştır</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.consoleBox}>
          <Text style={styles.consoleText}>{output}</Text>
        </View>
      </View>

      {/* ACTIVE PROCESSES (TASK MANAGER) */}
      <View style={styles.card}>
        <View style={styles.procHeader}>
          <View>
            <Text style={styles.cardTitle}>Açık Uygulamalar</Text>
            <Text style={styles.cardSubtitle}>{processes.length} aktif süreç izleniyor</Text>
          </View>
          {loadingProcs && <ActivityIndicator size="small" color={colors.primaryLight} />}
        </View>

        {processes.map((proc) => (
          <View key={proc.Id} style={styles.procRow}>
            <View style={styles.procInfo}>
              <Text style={styles.procName}>
                {proc.ProcessName} <Text style={styles.procId}>#{proc.Id}</Text>
              </Text>
              {proc.MainWindowTitle ? (
                <Text style={styles.procWindow} numberOfLines={1}>
                  {proc.MainWindowTitle}
                </Text>
              ) : null}
              <Text style={styles.procMem}>{proc.MemoryMB} MB RAM</Text>
            </View>

            <TouchableOpacity
              style={styles.killBtn}
              onPress={() => handleKillProcess(proc.Id, proc.ProcessName)}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle-outline" size={14} color={colors.danger} style={{ marginRight: 3 }} />
              <Text style={styles.killBtnText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  refreshBtnText: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badgeShell: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  badgeShellText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  cmdInput: {
    flex: 1,
    backgroundColor: colors.inputBackground,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: colors.text,
    fontSize: 13,
    fontFamily: 'monospace',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  runBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  runBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 12,
  },
  consoleBox: {
    backgroundColor: '#040711',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    minHeight: 110,
  },
  consoleText: {
    color: '#34D399',
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  procHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  procRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  procInfo: {
    flex: 1,
    marginRight: 10,
  },
  procName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  procId: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '400',
  },
  procWindow: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  procMem: {
    color: colors.accent,
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  killBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  killBtnText: {
    color: colors.dangerLight,
    fontSize: 11,
    fontWeight: '700',
  },
});
