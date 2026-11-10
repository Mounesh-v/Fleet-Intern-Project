import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function CustomAlert({
  visible,
  title,
  message,
  type = 'info',
  onCancel,
  onConfirm,
  onExtra,
  extraText = '',
  onDanger,
  dangerText = '',
  confirmText = 'OK',
  cancelText = 'Cancel',
}) {
  const colors = {
    success: '#16845B',
    error: '#C43D35',
    warning: '#D28A24',
    info: '#315F8D',
  };

  const icons = {
    success: 'checkmark-circle',
    error: 'close-circle',
    warning: 'alert-circle',
    info: 'information-circle',
  };

  const color = colors[type] || colors.info;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={[styles.iconCircle, { backgroundColor: `${color}18` }]}>
            <Ionicons name={icons[type]} size={32} color={color} />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.actions}>
            <View style={styles.buttons}>
              {onCancel && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onCancel}
                >
                  <Text style={styles.cancelText}>{cancelText}</Text>
                </TouchableOpacity>
              )}

              {extraText && onExtra && (
                <TouchableOpacity style={styles.cancelButton} onPress={onExtra}>
                  <Text style={styles.cancelText}>{extraText}</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.confirmButton}
                onPress={onConfirm}
              >
                <Text style={styles.confirmText}>{confirmText}</Text>
              </TouchableOpacity>
            </View>

            {dangerText && onDanger ? (
              <TouchableOpacity style={styles.dangerButton} onPress={onDanger}>
                <Text style={styles.dangerText}>{dangerText}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

/**
 * useCustomAlert — imperative wrapper around <CustomAlert /> so screens
 * can keep an Alert.alert()-style call shape:
 *
 *   const { alert, alertNode } = useCustomAlert();
 *   alert('Error', err.message, { type: 'error' });
 *   alert('Delete?', '...', { type: 'error', cancel: true,
 *     confirmText: 'Delete', onConfirm: doDelete });
 *
 * Render {alertNode} once at the component's root (outside any Modal).
 * The dialog closes first, then the callback runs.
 */
export function useCustomAlert() {
  const [config, setConfig] = useState(null);

  const alert = useCallback((title, message, options) => {
    const opts = options || {};
    setConfig({
      title: title == null ? '' : String(title),
      message: message == null ? '' : String(message),
      type: opts.type || 'info',
      confirmText: opts.confirmText || 'OK',
      cancelText: opts.cancelText || 'Cancel',
      cancel: Boolean(opts.cancel),
      extraText: opts.extraText || '',
      onExtra: opts.onExtra,
      dangerText: opts.dangerText || '',
      onDanger: opts.onDanger,
      onConfirm: opts.onConfirm,
      onCancel: opts.onCancel,
    });
  }, []);

  const alertNode = (
    <CustomAlert
      visible={config !== null}
      title={config ? config.title : ''}
      message={config ? config.message : ''}
      type={config ? config.type : 'info'}
      confirmText={config ? config.confirmText : 'OK'}
      cancelText={config ? config.cancelText : 'Cancel'}
      extraText={config ? config.extraText : ''}
      dangerText={config ? config.dangerText : ''}
      onDanger={
        config && config.onDanger
          ? () => {
              const fn = config.onDanger;
              setConfig(null);
              fn();
            }
          : undefined
      }
      onExtra={
        config && config.onExtra
          ? () => {
              const fn = config.onExtra;
              setConfig(null);
              fn();
            }
          : undefined
      }
      onCancel={
        config && config.cancel
          ? () => {
              const fn = config.onCancel;
              setConfig(null);
              if (fn) fn();
            }
          : undefined
      }
      onConfirm={() => {
        const fn = config ? config.onConfirm : undefined;
        setConfig(null);
        if (fn) fn();
      }}
    />
  );

  return { alert, alertNode };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(16,26,37,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFDFA',
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    elevation: 10,
  },
  iconCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: '#182535',
    textAlign: 'center',
  },
  message: {
    fontSize: 13,
    color: '#777C83',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 9,
    marginBottom: 22,
  },
  buttons: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  actions: {
    width: '100%',
    gap: 10,
  },
  dangerButton: {
    width: '100%',
    padding: 13,
    borderRadius: 12,
    backgroundColor: '#C43D35',
    alignItems: 'center',
  },
  dangerText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  cancelButton: {
    flex: 1,
    padding: 13,
    borderRadius: 12,
    backgroundColor: '#F0EDE7',
    alignItems: 'center',
  },
  confirmButton: {
    flex: 1,
    padding: 13,
    borderRadius: 12,
    backgroundColor: '#F5B923',
    alignItems: 'center',
  },
  cancelText: {
    color: '#182535',
    fontWeight: '700',
  },
  confirmText: {
    color: '#182535',
    fontWeight: '800',
  },
});