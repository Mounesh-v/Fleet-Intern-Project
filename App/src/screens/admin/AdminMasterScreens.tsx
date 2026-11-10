// @ts-nocheck
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Screen, Field, Chip, PrimaryButton, EmptyState, Loading } from '../../components/UI';
import SheetModal from '../../components/SheetModal';
import { useCustomAlert } from '../../components/CustomAlert';
import {
  fetchCustomers,
  createCustomer,
  updateCustomer,
  removeCustomer,
  fetchQuarries,
  createQuarry,
  removeQuarry,
  fetchMaterials,
  createMaterial,
  removeMaterial,
} from '../../services/adminService';

/**
 * MasterListScreen — shared list + add form for the simple master-data
 * screens (Customers, Quarries, Materials): white header with back/Add,
 * tappable rows (tap = delete confirm), draggable add sheet.
 */
function MasterListScreen({ navigation, config }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [values, setValues] = useState({});
  const [busy, setBusy] = useState(false);
  const { alert, alertNode } = useCustomAlert();

  const load = useCallback(async () => {
    try {
      const data = await config.fetchList();
      setItems(data[config.listKey] || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load records.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [config]);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    const initial = {};
    config.fields.forEach(field => {
      initial[field.key] = field.value || '';
    });
    setValues(initial);
    setEditId(null);
    setBusy(false);
    setAddOpen(true);
  };

  const openEdit = item => {
    if (!config.updateItem) return;
    const initial = {};
    config.fields.forEach(field => {
      const current = item[field.key];
      initial[field.key] =
        current !== undefined && current !== null
          ? String(current)
          : field.value || '';
    });
    setValues(initial);
    setEditId(item._id);
    setBusy(false);
    setAddOpen(true);
  };

  const save = async () => {
    if (busy) return;
    const missing = config.fields.find(
      field => field.required && !String(values[field.key] || '').trim(),
    );
    if (missing) {
      alert(config.addTitle, `${missing.label} is required.`, { type: 'warning' });
      return;
    }
    setBusy(true);
    try {
      const body = {};
      config.fields.forEach(field => {
        body[field.key] = String(values[field.key] || '').trim();
      });
      if (editId && config.updateItem) {
        await config.updateItem(editId, body);
      } else {
        await config.createItem(body);
      }
      setAddOpen(false);
      alert(
        'Saved',
        `${config.singular} ${editId ? 'updated' : 'created'} successfully.`,
        { type: 'success' },
      );
      setEditId(null);
      load();
    } catch (err) {
      alert(config.addTitle, err.message || 'Could not save.', { type: 'error' });
      setBusy(false);
    }
  };

  const confirmDelete = item => {
    alert(
      `Delete ${config.singular.toLowerCase()}`,
      `${config.itemLabel(item)} — this cannot be undone.`,
      {
        type: 'error',
        cancel: true,
        confirmText: 'Delete',
        onConfirm: async () => {
          try {
            await config.removeItem(item._id);
            load();
          } catch (err) {
            alert('Error', err.message, { type: 'error' });
          }
        },
      },
    );
  };

  if (loading) {
    return <Loading label={`Loading ${config.plural.toLowerCase()}…`} />;
  }

  return (
    <Screen style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor="#182F50"
          />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.back}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={22} color="#182F50" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>{config.title}</Text>
            <Text style={styles.subtitle}>
              {`${items.length} ${items.length === 1 ? config.singular : config.plural} in total`}
            </Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.8}>
            <Ionicons name="add" size={17} color="#182F50" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {items.length === 0 ? (
          <View style={styles.emptyCard}>
            <EmptyState title={config.empty.title} subtitle={config.empty.subtitle} />
          </View>
        ) : (
          items.map(item => (
            <View key={item._id} style={styles.rowCard}>
              <TouchableOpacity
                style={styles.rowBody}
                onPress={() => confirmDelete(item)}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                <View style={styles.rowIcon}>
                  <Ionicons name={config.icon} size={19} color="#33507A" />
                </View>
                <View style={styles.rowMain}>
                  <Text style={styles.rowTitle}>{config.itemLabel(item)}</Text>
                  <Text style={styles.rowSub}>{config.itemSub(item)}</Text>
                </View>
                <View style={styles.rowActions}>
                  {config.updateItem ? (
                    <TouchableOpacity
                      style={styles.rowActionBtn}
                      onPress={() => openEdit(item)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${config.singular}`}
                    >
                      <Ionicons name="pencil-outline" size={16} color="#33507A" />
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity
                    style={styles.rowActionBtn}
                    onPress={() => confirmDelete(item)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${config.singular}`}
                  >
                    <Ionicons name="trash-outline" size={16} color="#C43D35" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </View>
          ))
        )}

        <Text style={styles.hint}>Tap an item to delete it</Text>
      </ScrollView>

      <SheetModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        title={editId && config.editTitle ? config.editTitle : config.addTitle}
      >
        {config.fields.map(field =>
          field.options ? (
            <View key={field.key} style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>{field.label}</Text>
              <View style={styles.chipRow}>
                {field.options.map(option => (
                  <Chip
                    key={option}
                    label={option}
                    selected={(values[field.key] || field.value || '') === option}
                    onPress={() =>
                      setValues(prev => ({ ...prev, [field.key]: option }))
                    }
                    tone="orange"
                  />
                ))}
              </View>
            </View>
          ) : (
            <Field
              key={field.key}
              label={field.label}
              value={values[field.key] || ''}
              onChangeText={v => setValues(prev => ({ ...prev, [field.key]: v }))}
              placeholder={field.placeholder}
              keyboardType={field.keyboardType}
            />
          ),
        )}
        <PrimaryButton
          title={
            busy ? 'Saving…' : editId ? 'Save changes' : config.saveLabel
          }
          onPress={save}
          disabled={busy}
        />
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => setAddOpen(false)}
          hitSlop={8}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </SheetModal>
      {alertNode}
    </Screen>
  );
}

const CUSTOMER_CONFIG = {
  title: 'Customers',
  singular: 'Customer',
  plural: 'Customers',
  listKey: 'customers',
  icon: 'people-circle-outline',
  addTitle: 'Add customer',
  saveLabel: 'Save customer',
  empty: {
    title: 'No customers yet',
    subtitle: 'Add a customer to start billing work to them.',
  },
  fields: [
    { key: 'name', label: 'Name', placeholder: 'Customer name', required: true },
    { key: 'phone', label: 'Phone (optional)', placeholder: '9876543210', keyboardType: 'phone-pad' },
    { key: 'address', label: 'Address (optional)', placeholder: 'City / area' },
    {
      key: 'openingBalance',
      label: 'Opening balance (optional)',
      placeholder: '0',
      keyboardType: 'numeric',
    },
  ],
  itemLabel: item => item.name || 'Customer',
  itemSub: item =>
    [item.phone, item.address].filter(Boolean).join(' · ') || 'No contact details',
  fetchList: fetchCustomers,
  createItem: createCustomer,
  updateItem: updateCustomer,
  removeItem: removeCustomer,
  editTitle: 'Edit customer',
};

const QUARRY_CONFIG = {
  title: 'Quarries & suppliers',
  singular: 'Quarry',
  plural: 'Quarries',
  listKey: 'quarries',
  icon: 'triangle-outline',
  addTitle: 'Add quarry',
  saveLabel: 'Save quarry',
  empty: {
    title: 'No quarries yet',
    subtitle: 'Add quarries and suppliers with their locations.',
  },
  fields: [
    { key: 'name', label: 'Name', placeholder: 'Quarry / supplier name', required: true },
    { key: 'location', label: 'Location (optional)', placeholder: 'Town, district' },
  ],
  itemLabel: item => item.name || 'Quarry',
  itemSub: item => item.location || 'No location added',
  fetchList: fetchQuarries,
  createItem: createQuarry,
  removeItem: removeQuarry,
};

const MATERIAL_CONFIG = {
  title: 'Materials',
  singular: 'Material',
  plural: 'Materials',
  listKey: 'materials',
  icon: 'cube-outline',
  addTitle: 'Add material',
  saveLabel: 'Save material',
  empty: {
    title: 'No materials yet',
    subtitle: 'Add materials with the unit they are measured in.',
  },
  fields: [
    { key: 'name', label: 'Name', placeholder: 'Material name', required: true },
    {
      key: 'unit',
      label: 'Unit',
      options: ['LOAD', 'TONNE', 'CUBIC_METER'],
      value: 'LOAD',
    },
  ],
  itemLabel: item => item.name || 'Material',
  itemSub: item => `Unit: ${(item.unit || 'LOAD').replace('_', ' ')}`,
  fetchList: fetchMaterials,
  createItem: createMaterial,
  removeItem: removeMaterial,
};

export function AdminCustomersScreen({ navigation }) {
  return <MasterListScreen navigation={navigation} config={CUSTOMER_CONFIG} />;
}

export function AdminQuarriesScreen({ navigation }) {
  return <MasterListScreen navigation={navigation} config={QUARRY_CONFIG} />;
}

export function AdminMaterialsScreen({ navigation }) {
  return <MasterListScreen navigation={navigation} config={MATERIAL_CONFIG} />;
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0,
    paddingTop: 0,
    backgroundColor: '#F6F1E7',
  },
  scroll: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDFA',
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E9E0D2',
  },
  back: {
    marginRight: 8,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: '#182F50',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: '#85858A',
    marginTop: 4,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#F5B923',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 10,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#182F50',
  },
  errorCard: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E7B4AF',
    backgroundColor: '#FCEAEA',
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#C43D35',
  },
  emptyCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E9E0D2',
    backgroundColor: '#FFFDFA',
    padding: 16,
  },
  rowCard: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E9E0D2',
    backgroundColor: '#FFFDFA',
    overflow: 'hidden',
  },
  rowBody: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 66,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EFF3F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  rowMain: {
    flex: 1,
    paddingRight: 10,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowActionBtn: {
    padding: 7,
    borderRadius: 8,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#292D32',
  },
  rowSub: {
    fontSize: 11.5,
    color: '#85858A',
    marginTop: 3,
  },
  hint: {
    fontSize: 11,
    color: '#85858A',
    textAlign: 'center',
    marginTop: 18,
  },
  fieldBlock: {
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#292D32',
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#85858A',
  },
});
