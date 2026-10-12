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
import { colors } from '../theme/colors';
import Header from '../components/Header';
import { bridgeService } from '../services/bridgeService';

const QUICK_COMMANDS = [
  { label: '📂 Masaüstü', cmd: 'Get-ChildItem "$HOME\\Desktop" | Select-Object Name, Length | Format-Table -AutoSize' },
  { label: '🌐 IP & Ağ', cmd: 'Get-NetIPAddress -AddressFamily IPv4 | Select-Object InterfaceAlias, IPAddress' },
  { label: '💾 Disk Durumu', cmd: 'Get-PSDrive C | Select-Object @{N="UsedGB";E={[math]::Round($_.Used/1GB,1)}}, @{N="FreeGB";E={[math]::Round($_.Free/1GB,1)}}' },
  { label: '🔋 Pil Raporu', cmd: 'Get-CimInstance Win32_Battery | Select-Object Name, EstimatedChargeRemaining' },
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

    setRunning(true);
    const res = await bridgeService.execPowerShell(finalCmd.trim());
    const resultText = res.output || res.error || '(Komut tamamlandı, çıktı yok)';
    setOutput(`PS C:\\Users\\omar> ${finalCmd.trim()}\n\n${resultText}`);
    if (!cmdToRun) setCommand('');
    setRunning(false);
  };

  const handleKillProcess = async (pid, name) => {
    const res = await bridgeService.sendAction('kill_process', pid);
    setOutput(`PS C:\\Users\\omar> Stop-Process -Id ${pid} (${name})\n${res.output || res.error}`);
    loadProcesses();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Header
        subtitle="Uzaktan Komut & İşlemler"
        title="Terminal & Görevler 💻"
        rightElement={
          <TouchableOpacity style={styles.refreshBtn} onPress={loadProcesses}>
            <Text style={styles.refreshBtnText}>🔄 Yenile</Text>
          </TouchableOpacity>
        }
      />

      {/* POWERSHELL KONSOLU */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>⚡ Canlı PowerShell Konsolu</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {QUICK_COMMANDS.map((q) => (
            <TouchableOpacity
              key={q.label}
              style={styles.chip}
              onPress={() => handleRunCommand(q.cmd)}
            >
              <Text style={styles.chipText}>{q.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.cmdInput}
            placeholder="PowerShell komutu yaz..."
            placeholderTextColor={colors.textMuted}
            value={command}
            onChangeText={setCommand}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.runBtn}
            onPress={() => handleRunCommand()}
            disabled={running}
          >
            {running ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.runBtnText}>Çalıştır ▶</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.consoleBox}>
          <Text style={styles.consoleText}>{output}</Text>
        </View>
      </View>

      {/* AÇIK UYGULAMALAR (GÖREV YÖNETİCİSİ) */}
      <View style={styles.card}>
        <View style={styles.procHeader}>
          <Text style={styles.cardTitle}>📊 Açık Uygulamalar ({processes.length})</Text>
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
            >
              <Text style={styles.killBtnText}>🛑 Kapat</Text>
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
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
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
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  chip: {
    backgroundColor: colors.surfaceLight,
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
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 13,
    fontFamily: 'monospace',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  runBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    borderRadius: 12,
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
    backgroundColor: '#050811',
    borderRadius: 14,
    padding: 14,
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
    marginBottom: 8,
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
    fontWeight: '700',
    fontSize: 14,
  },
  procId: {
    color: colors.textMuted,
    fontWeight: '400',
    fontSize: 12,
  },
  procWindow: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  procMem: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  killBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: colors.danger,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  killBtnText: {
    color: '#F87171',
    fontSize: 11,
    fontWeight: '700',
  },
});
