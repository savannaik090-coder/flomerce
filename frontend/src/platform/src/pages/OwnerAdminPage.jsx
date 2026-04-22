import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../services/api.js';
import '../styles/owner-admin.css';
import { PLATFORM_DOMAIN } from '../config.js';
import { useToast } from '../../../shared/ui/Toast.jsx';
import { useConfirm } from '../../../shared/ui/ConfirmDialog.jsx';
import I18nAdminPanel from '../components/I18nAdminPanel.jsx';

function utcDate(s) { if (!s) return null; const v = String(s).trim(); const iso = v.includes('T') ? v : v.replace(' ', 'T'); return new Date(iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z'); }

export default function OwnerAdminPage() {
  const { t } = useTranslation(['owner', 'common']);
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [adminData, setAdminData] = useState(null);
  const [error, setError] = useState('');
  const [dataLoading, setDataLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingPlanName, setEditingPlanName] = useState(null);
  const [planForm, setPlanForm] = useState({
    plan_name: '', plan_tier: 1, features: '', is_popular: false, display_order: 0, tagline: '',
    monthly_price: '',
    cycles: {
      'monthly': { enabled: false, razorpay_plan_id: '', discount: 0 },
      '3months': { enabled: false, razorpay_plan_id: '', discount: 0 },
      '6months': { enabled: false, razorpay_plan_id: '', discount: 0 },
      'yearly': { enabled: false, razorpay_plan_id: '', discount: 10 },
    }
  });

  const [settings, setSettings] = useState({});
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ razorpay_key_id: '' });
  const [translatorTesting, setTranslatorTesting] = useState(false);
  const [translatorTestResult, setTranslatorTestResult] = useState(null);

  const [shards, setShards] = useState([]);
  const [shardsLoading, setShardsLoading] = useState(false);
  const [selectedShard, setSelectedShard] = useState(null);
  const [shardSites, setShardSites] = useState([]);
  const [shardSitesLoading, setShardSitesLoading] = useState(false);
  const [showCreateShard, setShowCreateShard] = useState(false);
  const [newShardName, setNewShardName] = useState('');
  const [creatingShardLoading, setCreatingShardLoading] = useState(false);
  const [showMoveSite, setShowMoveSite] = useState(null);
  const [moveSiteTarget, setMoveSiteTarget] = useState('');
  const [movingSite, setMovingSite] = useState(false);
  const [reconcilingShardId, setReconcilingShardId] = useState(null);

  const [enterpriseSites, setEnterpriseSites] = useState([]);
  const [enterpriseLoading, setEnterpriseLoading] = useState(false);
  const [enterpriseRates, setEnterpriseRates] = useState({ d1PerGB: 0.75, r2PerGB: 0.015 });
  const [enterpriseAssignNotes, setEnterpriseAssignNotes] = useState('');
  const [enterpriseAssignD1GB, setEnterpriseAssignD1GB] = useState('');
  const [enterpriseAssignR2GB, setEnterpriseAssignR2GB] = useState('');
  const [enterpriseSelectedSite, setEnterpriseSelectedSite] = useState(null);
  const [enterpriseSiteUsage, setEnterpriseSiteUsage] = useState(null);
  const [enterpriseUsageLoading, setEnterpriseUsageLoading] = useState(false);
  const [enterpriseSearchQuery, setEnterpriseSearchQuery] = useState('');
  const [enterpriseSearchResults, setEnterpriseSearchResults] = useState([]);
  const [enterpriseSearchLoading, setEnterpriseSearchLoading] = useState(false);
  const [enterpriseSelectedAssignSite, setEnterpriseSelectedAssignSite] = useState(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [loading, isAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      loadAdminData();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (activeTab === 'plans' && isAuthenticated) loadPlans();
    if (activeTab === 'settings' && isAuthenticated) loadSettings();
    if (activeTab === 'databases' && isAuthenticated) loadShards();
    if (activeTab === 'enterprise' && isAuthenticated) loadEnterpriseSites();
  }, [activeTab, isAuthenticated]);

  const loadAdminData = async () => {
    setDataLoading(true);
    try {
      const data = await apiRequest('/api/admin/stats');
      setAdminData(data);
    } catch (e) {
      setError(e.message || t('common.errorLoading'));
    } finally {
      setDataLoading(false);
    }
  };

  const handleBlockUser = async (userId) => {
    if (!(await confirm({ title: t('users.blockTitle'), message: t('users.blockMessage'), variant: 'danger', confirmText: t('users.blockConfirm') }))) return;
    try {
      await apiRequest(`/api/admin/users/${userId}/block`, { method: 'POST' });
      await loadAdminData();
      toast.success(t('users.blocked'));
    } catch (e) {
      toast.error(t('users.blockFailed', { error: e.message }));
    }
  };

  const loadPlans = async () => {
    setPlansLoading(true);
    try {
      const data = await apiRequest('/api/admin/plans');
      setPlans(Array.isArray(data) ? data : (data.data || data.plans || []));
    } catch (e) {
      console.error('Failed to load plans:', e);
    } finally {
      setPlansLoading(false);
    }
  };

  const CYCLE_KEYS = ['monthly', '3months', '6months', 'yearly'];
  const CYCLE_MONTHS = { 'monthly': 1, '3months': 3, '6months': 6, 'yearly': 12 };
  const cycleLabel = (key) => t(`plans.cycles.${key}`);
  const tierLabel = (tier) => t(`plans.tiers.${tier}`, { defaultValue: t('plans.tierGeneric', { tier }) });

  const emptyCycles = () => ({
    'monthly': { enabled: false, razorpay_plan_id: '', discount: 0 },
    '3months': { enabled: false, razorpay_plan_id: '', discount: 0 },
    '6months': { enabled: false, razorpay_plan_id: '', discount: 0 },
    'yearly': { enabled: false, razorpay_plan_id: '', discount: 10 },
  });

  const calcCyclePrice = (monthlyPrice, cycleKey, discount) => {
    const mp = parseFloat(monthlyPrice);
    if (!isFinite(mp) || mp <= 0) return { display: 0, original: 0 };
    const months = CYCLE_MONTHS[cycleKey];
    const original = Math.round(mp * months);
    const discounted = discount > 0 ? Math.round(original * (1 - discount / 100)) : original;
    return { display: discounted, original: discount > 0 ? original : null };
  };

  const resetPlanForm = () => {
    setPlanForm({ plan_name: '', plan_tier: 1, features: '', is_popular: false, display_order: 0, tagline: '', monthly_price: '', cycles: emptyCycles() });
    setEditingPlanName(null);
    setShowPlanForm(false);
  };

  const groupedPlans = () => {
    const groups = {};
    for (const p of plans) {
      if (!groups[p.plan_name]) {
        groups[p.plan_name] = { plan_name: p.plan_name, plan_tier: p.plan_tier, is_popular: !!p.is_popular, display_order: p.display_order || 0, features: p.features, tagline: p.tagline || '', cycles: [] };
      }
      groups[p.plan_name].cycles.push(p);
    }
    return Object.values(groups).sort((a, b) => a.display_order - b.display_order);
  };

  const handlePlanSubmit = async (e) => {
    e.preventDefault();
    const mp = parseFloat(planForm.monthly_price);
    if (!isFinite(mp) || mp <= 0) {
      toast.warning(t('plans.invalidMonthly'));
      return;
    }
    try {
      const enabledCycles = Object.entries(planForm.cycles)
        .filter(([, c]) => c.enabled && c.razorpay_plan_id)
        .map(([key, c]) => {
          const prices = calcCyclePrice(planForm.monthly_price, key, c.discount || 0);
          return {
            billing_cycle: key,
            display_price: prices.display,
            original_price: prices.original,
            razorpay_plan_id: c.razorpay_plan_id,
          };
        });

      if (enabledCycles.length === 0) {
        toast.warning(t('plans.noCyclesEnabled'));
        return;
      }

      const body = {
        plan_name: planForm.plan_name,
        plan_tier: parseInt(planForm.plan_tier) || 1,
        features: planForm.features ? planForm.features.split('\n').filter(f => f.trim()) : [],
        is_popular: planForm.is_popular,
        display_order: parseInt(planForm.display_order) || 0,
        tagline: planForm.tagline || '',
        cycles: enabledCycles,
      };
      if (editingPlanName && editingPlanName !== planForm.plan_name) {
        body.old_plan_name = editingPlanName;
      }

      await apiRequest('/api/admin/plans/bulk', { method: 'POST', body: JSON.stringify(body) });
      resetPlanForm();
      await loadPlans();
    } catch (e) {
      toast.error(t('plans.saveFailed', { error: e.message }));
    }
  };

  const handleEditGroupedPlan = (group) => {
    const cyc = emptyCycles();
    let derivedMonthly = '';
    for (const p of group.cycles) {
      if (cyc[p.billing_cycle]) {
        const months = CYCLE_MONTHS[p.billing_cycle];
        const fullPrice = p.original_price || p.display_price;
        const monthlyFromThis = Math.round(fullPrice / months);
        if (!derivedMonthly && p.is_active) derivedMonthly = monthlyFromThis;

        let disc = 0;
        if (p.original_price && p.original_price > p.display_price) {
          disc = Math.round((1 - p.display_price / p.original_price) * 100);
        }
        cyc[p.billing_cycle] = {
          enabled: !!p.is_active,
          razorpay_plan_id: p.razorpay_plan_id || '',
          discount: disc,
        };
      }
    }
    setPlanForm({
      plan_name: group.plan_name,
      plan_tier: group.plan_tier || 1,
      features: Array.isArray(group.features) ? group.features.join('\n') : '',
      is_popular: !!group.is_popular,
      display_order: group.display_order || 0,
      tagline: group.tagline || '',
      monthly_price: derivedMonthly || '',
      cycles: cyc,
    });
    setEditingPlanName(group.plan_name);
    setShowPlanForm(true);
  };

  const handleDeleteGroupedPlan = async (group) => {
    if (!(await confirm({ title: t('plans.deleteTitle'), message: t('plans.deleteMessage', { name: group.plan_name }), variant: 'danger', confirmText: t('plans.deleteConfirm') }))) return;
    try {
      await apiRequest('/api/admin/plans/bulk', { method: 'DELETE', body: JSON.stringify({ plan_name: group.plan_name }) });
      await loadPlans();
      toast.success(t('plans.planDeleted'));
    } catch (e) {
      toast.error(t('plans.deleteFailed', { error: e.message }));
    }
  };

  const updateCycle = (cycleKey, field, value) => {
    setPlanForm(prev => ({
      ...prev,
      cycles: { ...prev.cycles, [cycleKey]: { ...prev.cycles[cycleKey], [field]: value } }
    }));
  };

  const loadSettings = async () => {
    setSettingsLoading(true);
    try {
      const data = await apiRequest('/api/admin/settings');
      const s = data.data || data || {};
      setSettings(s);
      setSettingsForm({
        razorpay_key_id: s.razorpay_key_id || '',
        enterprise_enabled: s.enterprise_enabled === 'true',
        enterprise_message: s.enterprise_message || '',
        enterprise_email: s.enterprise_email || '',
        translator_region: s.translator_region || '',
        translator_api_key: s.translator_api_key_masked || '',
      });
      setTranslatorTestResult(null);
    } catch (e) {
      console.error('Failed to load settings:', e);
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSettingsSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    try {
      const payload = {
        ...settingsForm,
        enterprise_enabled: String(settingsForm.enterprise_enabled),
      };
      await apiRequest('/api/admin/settings', { method: 'PUT', body: JSON.stringify(payload) });
      toast.success(t('settings.saved'));
      await loadSettings();
    } catch (e) {
      toast.error(t('settings.saveFailed', { error: e.message }));
    }
  };

  const handleTranslatorTest = async () => {
    setTranslatorTesting(true);
    setTranslatorTestResult(null);
    try {
      const body = {
        api_key: settingsForm.translator_api_key || '',
        region: settingsForm.translator_region || '',
      };
      const res = await apiRequest('/api/admin/settings/translator/test', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const r = res.data || res;
      setTranslatorTestResult(r);
      if (r.ok) {
        toast.success(t('settings.translatorOk'));
      } else {
        toast.error(t('settings.translatorTestFailed', { error: r.error || t('settings.unknownError') }));
      }
    } catch (e) {
      const msg = e.message || t('settings.testFailed');
      setTranslatorTestResult({ ok: false, error: msg });
      toast.error(t('settings.translatorTestFailed', { error: msg }));
    } finally {
      setTranslatorTesting(false);
    }
  };

  const loadEnterpriseSites = async () => {
    setEnterpriseLoading(true);
    try {
      const data = await apiRequest('/api/admin/enterprise');
      const d = data.data || data;
      setEnterpriseSites(d.sites || []);
      if (d.rates) setEnterpriseRates(d.rates);
    } catch (e) {
      console.error('Failed to load enterprise sites:', e);
    } finally {
      setEnterpriseLoading(false);
    }
  };

  const handleEnterpriseSearch = async (query) => {
    setEnterpriseSearchQuery(query);
    if (query.trim().length < 2) {
      setEnterpriseSearchResults([]);
      return;
    }
    setEnterpriseSearchLoading(true);
    try {
      const data = await apiRequest(`/api/admin/enterprise/search?q=${encodeURIComponent(query.trim())}`);
      setEnterpriseSearchResults((data.data || data).sites || []);
    } catch (e) {
      console.error('Enterprise search error:', e);
    } finally {
      setEnterpriseSearchLoading(false);
    }
  };

  const handleAssignEnterprise = async (e) => {
    e.preventDefault();
    if (!enterpriseSelectedAssignSite) return;
    try {
      const parseGB = (s) => {
        if (s.trim() === '') return null;
        const n = Number(s);
        if (!Number.isFinite(n) || n < 0) return undefined;
        return n;
      };
      const d1Val = parseGB(enterpriseAssignD1GB);
      const r2Val = parseGB(enterpriseAssignR2GB);
      if (d1Val === undefined || r2Val === undefined) {
        toast.warning(t('enterprise.quotaInvalid'));
        return;
      }
      await apiRequest('/api/admin/enterprise/assign', {
        method: 'POST',
        body: JSON.stringify({
          siteId: enterpriseSelectedAssignSite.id,
          notes: enterpriseAssignNotes.trim() || null,
          d1LimitGB: d1Val,
          r2LimitGB: r2Val,
        }),
      });
      setEnterpriseSelectedAssignSite(null);
      setEnterpriseSearchQuery('');
      setEnterpriseSearchResults([]);
      setEnterpriseAssignNotes('');
      setEnterpriseAssignD1GB('');
      setEnterpriseAssignR2GB('');
      await loadEnterpriseSites();
    } catch (e) {
      toast.error(t('enterprise.assignFailed', { error: e.message }));
    }
  };

  const handleRemoveEnterprise = async (siteId) => {
    if (!(await confirm({ title: t('enterprise.removeTitle'), message: t('enterprise.removeMessage'), variant: 'danger', confirmText: t('enterprise.removeConfirm') }))) return;
    try {
      await apiRequest('/api/admin/enterprise/remove', {
        method: 'POST',
        body: JSON.stringify({ siteId }),
      });
      if (enterpriseSelectedSite === siteId) {
        setEnterpriseSelectedSite(null);
        setEnterpriseSiteUsage(null);
      }
      await loadEnterpriseSites();
    } catch (e) {
      toast.error(t('enterprise.removeFailed', { error: e.message }));
    }
  };

  const loadEnterpriseSiteUsage = async (siteId) => {
    setEnterpriseSelectedSite(siteId);
    setEnterpriseUsageLoading(true);
    try {
      const data = await apiRequest(`/api/admin/enterprise/usage?siteId=${siteId}`);
      setEnterpriseSiteUsage(data.data || data);
    } catch (e) {
      console.error('Failed to load enterprise usage:', e);
    } finally {
      setEnterpriseUsageLoading(false);
    }
  };

  const handleUpdateQuota = async (site) => {
    const currentD1GB = site.d1LimitOverride ? (site.d1Limit / (1024 * 1024 * 1024)).toString() : '';
    const currentR2GB = site.r2LimitOverride ? (site.r2Limit / (1024 * 1024 * 1024)).toString() : '';
    const d1Input = window.prompt(
      t('databases.promptD1', { name: site.subdomain }),
      currentD1GB
    );
    if (d1Input === null) return;
    const r2Input = window.prompt(
      t('databases.promptR2', { name: site.subdomain }),
      currentR2GB
    );
    if (r2Input === null) return;
    const parseGB = (s) => {
      if (s.trim() === '') return null;
      const n = Number(s);
      if (!Number.isFinite(n) || n < 0) return undefined;
      return n;
    };
    const d1Val = parseGB(d1Input);
    const r2Val = parseGB(r2Input);
    if (d1Val === undefined || r2Val === undefined) {
      toast.warning(t('enterprise.quotaInvalidShort'));
      return;
    }
    try {
      await apiRequest('/api/admin/enterprise/update-quota', {
        method: 'POST',
        body: JSON.stringify({
          siteId: site.siteId,
          d1LimitGB: d1Val,
          r2LimitGB: r2Val,
        }),
      });
      await loadEnterpriseSites();
      if (enterpriseSelectedSite === site.siteId) await loadEnterpriseSiteUsage(site.siteId);
    } catch (e) {
      toast.error(t('enterprise.updateQuotaFailed', { error: e.message }));
    }
  };

  const handleSnapshotUsage = async (siteId) => {
    if (!(await confirm({ title: t('enterprise.snapshotTitle'), message: t('enterprise.snapshotMessage'), confirmText: t('enterprise.snapshotConfirm') }))) return;
    try {
      await apiRequest('/api/admin/enterprise/snapshot', {
        method: 'POST',
        body: JSON.stringify({ siteId }),
      });
      toast.success(t('enterprise.snapshotSaved'));
      await loadEnterpriseSiteUsage(siteId);
    } catch (e) {
      toast.error(t('enterprise.snapshotFailed', { error: e.message }));
    }
  };

  const handleMarkPaid = async (siteId, yearMonth) => {
    const notes = window.prompt(t('enterprise.promptPaymentNote'));
    if (notes === null) return;
    try {
      await apiRequest('/api/admin/enterprise/mark-paid', {
        method: 'POST',
        body: JSON.stringify({ siteId, yearMonth, notes: notes || null }),
      });
      await loadEnterpriseSiteUsage(siteId);
    } catch (e) {
      toast.error(t('enterprise.markPaidFailed', { error: e.message }));
    }
  };

  const handleSaveOverageRates = async () => {
    try {
      await apiRequest('/api/admin/enterprise/rates', {
        method: 'PUT',
        body: JSON.stringify(enterpriseRates),
      });
      toast.success(t('enterprise.ratesUpdated'));
    } catch (e) {
      toast.error(t('enterprise.ratesFailed', { error: e.message }));
    }
  };

  const loadShards = async () => {
    setShardsLoading(true);
    try {
      const data = await apiRequest('/api/admin/shards');
      setShards(data.data || data || []);
    } catch (e) {
      console.error('Failed to load shards:', e);
    } finally {
      setShardsLoading(false);
    }
  };

  const loadShardSites = async (shardId) => {
    setShardSitesLoading(true);
    try {
      const data = await apiRequest(`/api/admin/shards/${shardId}/sites`);
      setShardSites(data.data?.sites || []);
    } catch (e) {
      console.error('Failed to load shard sites:', e);
      setShardSites([]);
    } finally {
      setShardSitesLoading(false);
    }
  };

  const handleCreateShard = async (e) => {
    e.preventDefault();
    if (!newShardName.trim()) return;
    setCreatingShardLoading(true);
    try {
      const data = await apiRequest('/api/admin/shards', {
        method: 'POST',
        body: JSON.stringify({ name: newShardName.trim() }),
      });
      const result = data.data || data;
      if (result.note) {
        toast.success(t('databases.shardCreatedNote', { note: result.note }));
      } else {
        toast.success(t('databases.shardCreated'));
      }
      setNewShardName('');
      setShowCreateShard(false);
      await loadShards();
    } catch (e) {
      toast.error(t('databases.createFailed', { error: e.message }));
    } finally {
      setCreatingShardLoading(false);
    }
  };

  const refreshSelectedShard = async () => {
    const data = await apiRequest('/api/admin/shards');
    const list = data.data || data || [];
    setShards(list);
    if (selectedShard) {
      const updated = list.find(s => s.id === selectedShard.id);
      if (updated) {
        setSelectedShard(updated);
      } else {
        setSelectedShard(null);
        setShardSites([]);
      }
    }
  };

  const handleReconcileShard = async (shardId) => {
    setReconcilingShardId(shardId);
    try {
      await apiRequest(`/api/admin/shards/${shardId}/reconcile`, { method: 'POST' });
      toast.success(t('databases.reconciled'));
      await refreshSelectedShard();
      if (selectedShard?.id === shardId) {
        await loadShardSites(shardId);
      }
    } catch (e) {
      toast.error(t('databases.reconcileFailed', { error: e.message }));
    } finally {
      setReconcilingShardId(null);
    }
  };

  const handleSetActive = async (shardId) => {
    try {
      await apiRequest(`/api/admin/shards/${shardId}/set-active`, {
        method: 'POST',
        body: JSON.stringify({ active: true }),
      });
      await refreshSelectedShard();
    } catch (e) {
      toast.error(t('databases.setActiveFailed', { error: e.message }));
    }
  };

  const handleMoveSite = async () => {
    if (!showMoveSite || !moveSiteTarget) return;
    setMovingSite(true);
    try {
      await apiRequest('/api/admin/shards/move-site', {
        method: 'POST',
        body: JSON.stringify({ siteId: showMoveSite.siteId, targetShardId: moveSiteTarget }),
      });
      toast.success(t('databases.siteMoved'));
      setShowMoveSite(null);
      setMoveSiteTarget('');
      await refreshSelectedShard();
      if (selectedShard) {
        await loadShardSites(selectedShard.id);
      }
    } catch (e) {
      toast.error(t('databases.moveFailed', { error: e.message }));
    } finally {
      setMovingSite(false);
    }
  };

  const handleDeleteShard = async (shardId, shardName) => {
    if (!(await confirm({ title: t('databases.deleteShardTitle'), message: t('databases.deleteShardMessage', { name: shardName }), variant: 'danger', confirmText: t('databases.deleteShardConfirm') }))) return;
    try {
      await apiRequest(`/api/admin/shards/${shardId}`, { method: 'DELETE' });
      toast.success(t('databases.shardDeleted'));
      setSelectedShard(null);
      await loadShards();
    } catch (e) {
      toast.error(t('databases.deleteShardFailed', { error: e.message }));
    }
  };

  const handleViewShard = (shard) => {
    setSelectedShard(shard);
    loadShardSites(shard.id);
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading || dataLoading) {
    return (
      <div className="oa-loading">
        <div className="oa-spinner" />
        <p>{t('common.loadingPanel')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="oa-page">
        <div className="oa-header">
          <h1>{t('header.ownerTitle')}</h1>
          <button className="oa-btn oa-btn-outline" onClick={() => navigate('/dashboard')}>{t('common.back')}</button>
        </div>
        <div className="oa-card oa-error-card">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const users = adminData?.users || [];
  const allSites = adminData?.sites || [];
  const currentOwner = adminData?.currentOwner;
  const totalOrders = adminData?.totalOrders || 0;

  return (
    <div className="oa-page">
      <div className="oa-header">
        <div>
          <h1>{t('header.title')}</h1>
          {currentOwner && (
            <p className="oa-owner-info">{t('header.owner', { name: currentOwner.name || currentOwner.email })}</p>
          )}
        </div>
        <button className="oa-btn oa-btn-outline" onClick={() => navigate('/dashboard')}>{t('header.backToDashboard')}</button>
      </div>

      <div className="oa-tabs">
        <button className={`oa-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>{t('tabs.overview')}</button>
        <button className={`oa-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>{t('tabs.users')}</button>
        <button className={`oa-tab ${activeTab === 'sites' ? 'active' : ''}`} onClick={() => setActiveTab('sites')}>{t('tabs.sites')}</button>
        <button className={`oa-tab ${activeTab === 'databases' ? 'active' : ''}`} onClick={() => setActiveTab('databases')}>{t('tabs.databases')}</button>
        <button className={`oa-tab ${activeTab === 'plans' ? 'active' : ''}`} onClick={() => setActiveTab('plans')}>{t('tabs.plans')}</button>
        <button className={`oa-tab ${activeTab === 'enterprise' ? 'active' : ''}`} onClick={() => setActiveTab('enterprise')}>{t('tabs.enterprise')}</button>
        <button className={`oa-tab ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>{t('tabs.settings')}</button>
        <button className={`oa-tab ${activeTab === 'i18n' ? 'active' : ''}`} onClick={() => setActiveTab('i18n')}>{t('tabs.i18n')}</button>
      </div>

      {activeTab === 'i18n' && <I18nAdminPanel />}

      {activeTab === 'overview' && (
        <div className="oa-overview">
          <div className="oa-stats-grid">
            <div className="oa-stat-card">
              <div className="oa-stat-value">{users.length}</div>
              <div className="oa-stat-label">{t('overview.totalUsers')}</div>
            </div>
            <div className="oa-stat-card">
              <div className="oa-stat-value">{allSites.length}</div>
              <div className="oa-stat-label">{t('overview.totalWebsites')}</div>
            </div>
            <div className="oa-stat-card">
              <div className="oa-stat-value">{totalOrders}</div>
              <div className="oa-stat-label">{t('overview.totalOrders')}</div>
            </div>
          </div>

          <div className="oa-card">
            <h3>{t('overview.recentUsers')}</h3>
            <div className="oa-list">
              {users.slice(0, 5).map(u => (
                <div className="oa-list-item" key={u.id || u.email}>
                  <div className="oa-list-info">
                    <span className="oa-list-name">{u.name}</span>
                    <span className="oa-list-sub">{u.email}</span>
                  </div>
                  <span className="oa-badge">{u.plan || t('common.noPlan')}</span>
                </div>
              ))}
              {users.length === 0 && <p className="oa-empty">{t('overview.noUsers')}</p>}
            </div>
          </div>

          <div className="oa-card">
            <h3>{t('overview.recentWebsites')}</h3>
            <div className="oa-list">
              {allSites.slice(0, 5).map(s => (
                <div className="oa-list-item" key={s.id || s.subdomain}>
                  <div className="oa-list-info">
                    <span className="oa-list-name">{s.brand_name || s.subdomain}</span>
                    <span className="oa-list-sub">{s.subdomain}.{PLATFORM_DOMAIN}</span>
                  </div>
                  <span className="oa-badge oa-badge-green">{t('common.active')}</span>
                </div>
              ))}
              {allSites.length === 0 && <p className="oa-empty">{t('overview.noWebsites')}</p>}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="oa-section">
          <div className="oa-card">
            <h3>{t('users.allUsers', { count: users.length })}</h3>
            <div className="oa-table-wrap">
              <table className="oa-table">
                <thead>
                  <tr>
                    <th>{t('users.name')}</th>
                    <th>{t('users.email')}</th>
                    <th>{t('users.plan')}</th>
                    <th>{t('users.joined')}</th>
                    <th>{t('users.action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id || u.email}>
                      <td data-label={t('users.name')}>{u.name}</td>
                      <td data-label={t('users.email')}>{u.email}</td>
                      <td data-label={t('users.plan')}><span className="oa-badge">{u.plan || t('common.noPlan')}</span></td>
                      <td data-label={t('users.joined')}>{u.created_at ? utcDate(u.created_at).toLocaleDateString() : '-'}</td>
                      <td data-label={t('users.action')}>
                        {u.email !== currentOwner?.email && (
                          <button className="oa-btn-sm oa-btn-danger" onClick={() => handleBlockUser(u.id)}>{t('users.block')}</button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan="5" className="oa-empty">{t('users.noUsers')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="oa-card-list-mobile">
              {users.map(u => (
                <div className="oa-user-card" key={u.id || u.email}>
                  <div className="oa-user-card-header">
                    <div>
                      <div className="oa-user-card-name">{u.name}</div>
                      <div className="oa-user-card-email">{u.email}</div>
                    </div>
                    <span className="oa-badge">{u.plan || t('common.noPlan')}</span>
                  </div>
                  <div className="oa-user-card-footer">
                    <span className="oa-user-card-date">{t('users.joinedPrefix', { date: u.created_at ? utcDate(u.created_at).toLocaleDateString() : '-' })}</span>
                    {u.email !== currentOwner?.email && (
                      <button className="oa-btn-sm oa-btn-danger" onClick={() => handleBlockUser(u.id)}>{t('users.block')}</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sites' && (
        <div className="oa-section">
          <div className="oa-card">
            <h3>{t('sites.allWebsites', { count: allSites.length })}</h3>
            <div className="oa-table-wrap">
              <table className="oa-table">
                <thead>
                  <tr>
                    <th>{t('sites.siteName')}</th>
                    <th>{t('sites.subdomain')}</th>
                    <th>{t('sites.userId')}</th>
                    <th>{t('common.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {allSites.map(s => (
                    <tr key={s.id || s.subdomain}>
                      <td data-label={t('sites.siteName')}>{s.brand_name || s.subdomain}</td>
                      <td data-label={t('sites.subdomain')}>{s.subdomain}.{PLATFORM_DOMAIN}</td>
                      <td data-label={t('sites.userId')}>{s.user_id}</td>
                      <td data-label={t('common.status')}><span className="oa-badge oa-badge-green">{t('common.active')}</span></td>
                    </tr>
                  ))}
                  {allSites.length === 0 && (
                    <tr><td colSpan="4" className="oa-empty">{t('sites.noWebsites')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="oa-card-list-mobile">
              {allSites.map(s => (
                <div className="oa-user-card" key={s.id || s.subdomain}>
                  <div className="oa-user-card-header">
                    <div>
                      <div className="oa-user-card-name">{s.brand_name || s.subdomain}</div>
                      <div className="oa-user-card-email">{s.subdomain}.{PLATFORM_DOMAIN}</div>
                    </div>
                    <span className="oa-badge oa-badge-green">{t('common.active')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'databases' && (
        <div className="oa-section">
          {selectedShard ? (
            <div>
              <button className="oa-btn oa-btn-outline" onClick={() => { setSelectedShard(null); setShardSites([]); }} style={{ marginBottom: '1rem' }}>
                {t('databases.back')}
              </button>

              <div className="oa-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{selectedShard.database_name}</h3>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                      {t('databases.bindingLabel')} <code>{selectedShard.binding_name}</code> &middot; {t('databases.idLabel')} <code style={{ fontSize: '0.65rem' }}>{selectedShard.database_id}</code>
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {!selectedShard.is_active && (
                      <button className="oa-btn-sm oa-btn-edit" onClick={() => handleSetActive(selectedShard.id)}>{t('databases.setActive')}</button>
                    )}
                    <button
                      className="oa-btn-sm oa-btn-toggle"
                      disabled={reconcilingShardId === selectedShard.id}
                      onClick={() => handleReconcileShard(selectedShard.id)}
                    >
                      {reconcilingShardId === selectedShard.id ? t('databases.reconciling') : t('databases.reconcile')}
                    </button>
                    <button className="oa-btn-sm oa-btn-danger" onClick={() => handleDeleteShard(selectedShard.id, selectedShard.database_name)}>{t('common.delete')}</button>
                  </div>
                </div>

                {selectedShard.bindingAvailable === false && (
                  <div style={{ marginBottom: '1rem', padding: '0.6rem 0.75rem', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '6px', fontSize: '0.78rem', color: '#92400e' }}>
                    <div style={{ fontWeight: 600, marginBottom: '0.3rem' }}>{t('databases.bindingMissingTitle')}</div>
                    <div style={{ marginBottom: '0.4rem' }}>{t('databases.bindingMissingDesc', { binding: selectedShard.binding_name })}</div>
                    <div style={{ marginBottom: '0.3rem' }}>{t('databases.addToWranglerLong')}</div>
                    <pre style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '4px', padding: '0.5rem 0.6rem', margin: 0, fontSize: '0.72rem', color: '#78350f', whiteSpace: 'pre-wrap', wordBreak: 'break-all', cursor: 'text', userSelect: 'text' }}>{`[[d1_databases]]\nbinding = "${selectedShard.binding_name}"\ndatabase_name = "${selectedShard.database_name}"\ndatabase_id = "${selectedShard.database_id}"`}</pre>
                  </div>
                )}

                <div className="oa-db-stats-row">
                  <div className="oa-db-stat">
                    <span className="oa-db-stat-label">{t('databases.size')}</span>
                    <span className="oa-db-stat-value">{selectedShard.sizeMB} MB</span>
                  </div>
                  <div className="oa-db-stat">
                    <span className="oa-db-stat-label">{t('databases.sites')}</span>
                    <span className="oa-db-stat-value">{selectedShard.siteCount}</span>
                  </div>
                  <div className="oa-db-stat">
                    <span className="oa-db-stat-label">{t('databases.binding')}</span>
                    <span className={`oa-badge ${selectedShard.bindingAvailable ? 'oa-badge-green' : 'oa-badge-red'}`}>{selectedShard.bindingAvailable ? t('databases.connected') : t('databases.missing')}</span>
                  </div>
                  <div className="oa-db-stat">
                    <span className="oa-db-stat-label">{t('common.status')}</span>
                    <span className={`oa-badge ${selectedShard.is_active ? 'oa-badge-green' : ''}`}>{selectedShard.is_active ? t('common.active') : t('common.inactive')}</span>
                  </div>
                  <div className="oa-db-stat">
                    <span className="oa-db-stat-label">{t('databases.correctionFactor')}</span>
                    <span className="oa-db-stat-value">{selectedShard.correction_factor?.toFixed(2) || '1.00'}</span>
                  </div>
                </div>

                {selectedShard.isNearLimit && (
                  <div className="oa-db-alert">
                    {t('databases.approachingLimit', { size: selectedShard.sizeAlertGB })}
                  </div>
                )}
              </div>

              <div className="oa-card" style={{ marginTop: '1rem' }}>
                <h3>{t('databases.sitesOnShard', { count: shardSites.length })}</h3>
                {shardSitesLoading ? (
                  <p className="oa-empty">{t('databases.loadingSites')}</p>
                ) : shardSites.length === 0 ? (
                  <p className="oa-empty">{t('databases.noSitesOnShard')}</p>
                ) : (
                  <>
                    <div className="oa-table-wrap">
                      <table className="oa-table">
                        <thead>
                          <tr>
                            <th>{t('databases.siteCol')}</th>
                            <th>{t('databases.d1Usage')}</th>
                            <th>{t('databases.r2Usage')}</th>
                            <th>{t('databases.created')}</th>
                            <th>{t('common.actions')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {shardSites.map(s => (
                            <tr key={s.siteId}>
                              <td data-label={t('databases.siteCol')}>
                                <div style={{ fontWeight: 600 }}>{s.brandName || s.subdomain}</div>
                                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{s.subdomain}.{PLATFORM_DOMAIN}</div>
                              </td>
                              <td data-label="D1">{formatBytes(s.d1BytesDisplayed || 0)}</td>
                              <td data-label="R2">{formatBytes(s.r2BytesUsed || 0)}</td>
                              <td data-label={t('databases.created')}>{s.createdAt ? utcDate(s.createdAt).toLocaleDateString() : '-'}</td>
                              <td data-label={t('common.actions')}>
                                <button
                                  className="oa-btn-sm oa-btn-edit"
                                  onClick={() => { setShowMoveSite(s); setMoveSiteTarget(''); }}
                                  disabled={shards.length < 2}
                                  title={shards.length < 2 ? t('databases.moveDisabledTooltip') : t('databases.moveTooltip')}
                                >
                                  {t('databases.move')}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="oa-card-list-mobile">
                      {shardSites.map(s => (
                        <div className="oa-user-card" key={s.siteId}>
                          <div className="oa-user-card-header">
                            <div>
                              <div className="oa-user-card-name">{s.brandName || s.subdomain}</div>
                              <div className="oa-user-card-email">{s.subdomain}.{PLATFORM_DOMAIN}</div>
                              <div className="oa-user-card-email">D1: {formatBytes(s.d1BytesDisplayed || 0)} &middot; R2: {formatBytes(s.r2BytesUsed || 0)}</div>
                            </div>
                          </div>
                          <div className="oa-user-card-footer">
                            <span className="oa-user-card-date">{s.createdAt ? utcDate(s.createdAt).toLocaleDateString() : '-'}</span>
                            <button
                              className="oa-btn-sm oa-btn-edit"
                              onClick={() => { setShowMoveSite(s); setMoveSiteTarget(''); }}
                              disabled={shards.length < 2}
                            >
                              {t('databases.move')}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div className="oa-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h3 style={{ margin: 0 }}>{t('databases.title', { count: shards.length })}</h3>
                  <button className="oa-btn oa-btn-primary" onClick={() => setShowCreateShard(true)}>{t('databases.newShard')}</button>
                </div>

                {showCreateShard && (
                  <div className="oa-plan-form-wrap" style={{ marginBottom: '1rem' }}>
                    <form onSubmit={handleCreateShard}>
                      <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem' }}>{t('databases.createTitle')}</h4>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.75rem' }}>
                        {t('databases.createDesc')}
                      </p>
                      <div className="oa-form-group">
                        <label>{t('databases.databaseName')}</label>
                        <input
                          type="text"
                          value={newShardName}
                          onChange={e => setNewShardName(e.target.value)}
                          placeholder={t('databases.databaseNamePlaceholder')}
                          required
                          disabled={creatingShardLoading}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                        <button type="submit" className="oa-btn oa-btn-primary" disabled={creatingShardLoading}>
                          {creatingShardLoading ? t('databases.creating') : t('databases.createShard')}
                        </button>
                        <button type="button" className="oa-btn oa-btn-outline" onClick={() => { setShowCreateShard(false); setNewShardName(''); }} disabled={creatingShardLoading}>
                          {t('common.cancel')}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {shardsLoading ? (
                  <p className="oa-empty">{t('databases.loadingShards')}</p>
                ) : shards.length === 0 ? (
                  <div className="oa-empty">
                    <p>{t('databases.emptyTitle')}</p>
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{t('databases.emptyDesc')}</p>
                  </div>
                ) : (
                  <div className="oa-db-grid">
                    {shards.map(shard => (
                      <div key={shard.id} className={`oa-db-card ${shard.is_active ? 'oa-db-card-active' : ''}`} onClick={() => handleViewShard(shard)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>{shard.database_name}</div>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.15rem' }}>{shard.binding_name}</div>
                          </div>
                          {shard.is_active ? (
                            <span className="oa-badge oa-badge-green">{t('common.active')}</span>
                          ) : (
                            <span className="oa-badge">{t('common.inactive')}</span>
                          )}
                        </div>
                        <div className="oa-db-stats-row">
                          <div className="oa-db-stat">
                            <span className="oa-db-stat-label">{t('databases.size')}</span>
                            <span className="oa-db-stat-value">{shard.sizeMB} MB</span>
                          </div>
                          <div className="oa-db-stat">
                            <span className="oa-db-stat-label">{t('databases.sites')}</span>
                            <span className="oa-db-stat-value">{shard.siteCount}</span>
                          </div>
                          <div className="oa-db-stat">
                            <span className="oa-db-stat-label">{t('databases.factor')}</span>
                            <span className="oa-db-stat-value">{shard.correction_factor?.toFixed(2) || '1.00'}</span>
                          </div>
                        </div>
                        {shard.isNearLimit && (
                          <div className="oa-db-alert">{t('databases.near10gb')}</div>
                        )}
                        {shard.bindingAvailable === false && (
                          <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.6rem', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '6px', fontSize: '0.72rem', color: '#92400e' }}>
                            <div style={{ fontWeight: 600, marginBottom: '0.3rem' }}>{t('databases.bindingMissingShortTitle')}</div>
                            <div style={{ marginBottom: '0.3rem' }}>{t('databases.addToWranglerShort')}</div>
                            <pre onClick={(e) => e.stopPropagation()} style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '4px', padding: '0.4rem 0.5rem', margin: 0, fontSize: '0.68rem', color: '#78350f', whiteSpace: 'pre-wrap', wordBreak: 'break-all', cursor: 'text', userSelect: 'text' }}>{`[[d1_databases]]\nbinding = "${shard.binding_name}"\ndatabase_name = "${shard.database_name}"\ndatabase_id = "${shard.database_id}"`}</pre>
                          </div>
                        )}
                        <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {!shard.is_active && (
                            <button className="oa-btn-sm oa-btn-edit" onClick={(e) => { e.stopPropagation(); handleSetActive(shard.id); }}>{t('databases.setActive')}</button>
                          )}
                          <button
                            className="oa-btn-sm oa-btn-toggle"
                            disabled={reconcilingShardId === shard.id}
                            onClick={(e) => { e.stopPropagation(); handleReconcileShard(shard.id); }}
                          >
                            {reconcilingShardId === shard.id ? t('databases.reconciling') : t('databases.reconcile')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="oa-card" style={{ marginTop: '1rem' }}>
                <h3>{t('databases.howTitle')}</h3>
                <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.7 }}>
                  <p><strong>{t('databases.howShardsLabel')}</strong>{t('databases.howShardsBody')}</p>
                  <p><strong>{t('databases.howActiveLabel')}</strong>{t('databases.howActiveBody')}</p>
                  <p><strong>{t('databases.howReconcileLabel')}</strong>{t('databases.howReconcileBody')}</p>
                  <p><strong>{t('databases.howMoveLabel')}</strong>{t('databases.howMoveBody')}</p>
                  <p><strong>{t('databases.howCapacityLabel')}</strong>{t('databases.howCapacityBody')}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showMoveSite && (
        <div className="oa-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="move-site-title" onClick={() => { if (!movingSite) { setShowMoveSite(null); setMoveSiteTarget(''); } }} onKeyDown={e => { if (e.key === 'Escape' && !movingSite) { setShowMoveSite(null); setMoveSiteTarget(''); } }}>
          <div className="oa-modal" onClick={e => e.stopPropagation()}>
            <h3 id="move-site-title" style={{ margin: '0 0 0.75rem' }}>{t('databases.moveModalTitle')}</h3>
            <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0 0 1rem' }}>
              {t('databases.moveModalIntro')}<strong>{showMoveSite.brandName || showMoveSite.subdomain}</strong>{t('databases.moveModalOutro')}
            </p>
            <div className="oa-form-group">
              <label>{t('databases.targetShard')}</label>
              <select value={moveSiteTarget} onChange={e => setMoveSiteTarget(e.target.value)} disabled={movingSite}>
                <option value="">{t('databases.selectShard')}</option>
                {shards.filter(s => !selectedShard || s.id !== selectedShard.id).map(s => (
                  <option key={s.id} value={s.id}>{t('databases.shardOption', { name: s.database_name, binding: s.binding_name, size: s.sizeMB, count: s.siteCount })}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
              <button className="oa-btn oa-btn-outline" onClick={() => { setShowMoveSite(null); setMoveSiteTarget(''); }} disabled={movingSite}>{t('common.cancel')}</button>
              <button className="oa-btn oa-btn-primary" onClick={handleMoveSite} disabled={!moveSiteTarget || movingSite}>
                {movingSite ? t('databases.moving') : t('databases.moveSite')}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'plans' && (
        <div className="oa-section">
          <div className="oa-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>{t('plans.title', { count: groupedPlans().length })}</h3>
              <button className="oa-btn oa-btn-primary" onClick={() => { resetPlanForm(); setShowPlanForm(true); }}>
                {t('plans.addPlan')}
              </button>
            </div>

            {showPlanForm && (
              <div className="oa-plan-form-wrap">
                <form onSubmit={handlePlanSubmit} className="oa-plan-form">
                  <h4 style={{ margin: '0 0 1rem' }}>{editingPlanName ? t('plans.editTitle', { name: editingPlanName }) : t('plans.addTitle')}</h4>
                  <div className="oa-form-grid">
                    <div className="oa-form-group">
                      <label>{t('plans.planName')}</label>
                      <input type="text" value={planForm.plan_name} onChange={e => setPlanForm({ ...planForm, plan_name: e.target.value })} placeholder={t('plans.planNamePlaceholder')} required />
                    </div>
                    <div className="oa-form-group">
                      <label>{t('plans.tagline')}</label>
                      <input type="text" value={planForm.tagline} onChange={e => setPlanForm({ ...planForm, tagline: e.target.value })} placeholder={t('plans.taglinePlaceholder')} maxLength={80} />
                    </div>
                    <div className="oa-form-group">
                      <label>{t('plans.planTier')}</label>
                      <select value={planForm.plan_tier} onChange={e => setPlanForm({ ...planForm, plan_tier: parseInt(e.target.value) })}>
                        {[1, 2, 3, 4].map(val => (
                          <option key={val} value={val}>{tierLabel(val)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="oa-form-group">
                      <label>{t('plans.displayOrder')}</label>
                      <input type="number" value={planForm.display_order} onChange={e => setPlanForm({ ...planForm, display_order: e.target.value })} />
                    </div>
                    <div className="oa-form-group oa-form-check">
                      <label>
                        <input type="checkbox" checked={planForm.is_popular} onChange={e => setPlanForm({ ...planForm, is_popular: e.target.checked })} />
                        {t('plans.markPopular')}
                      </label>
                    </div>
                  </div>
                  <div className="oa-form-group" style={{ marginTop: '0.5rem' }}>
                    <label>{t('plans.features')}</label>
                    <textarea rows="5" value={planForm.features} onChange={e => setPlanForm({ ...planForm, features: e.target.value })} placeholder={t('plans.featuresPlaceholder')} />
                    <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: '0.25rem 0 0' }}>{t('plans.featuresHint')}</p>
                  </div>

                  <div style={{ marginTop: '1rem' }}>
                    <div className="oa-form-group">
                      <label style={{ fontWeight: 600 }}>{t('plans.monthlyPrice')}</label>
                      <input type="number" step="1" value={planForm.monthly_price} onChange={e => setPlanForm({ ...planForm, monthly_price: e.target.value })} placeholder={t('plans.monthlyPricePlaceholder')} required style={{ maxWidth: '200px' }} />
                      <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: '0.25rem 0 0' }}>{t('plans.monthlyPriceHint')}</p>
                    </div>

                    <label style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>{t('plans.billingCycles')}</label>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.75rem' }}>{t('plans.billingCyclesHint')}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {CYCLE_KEYS.map((key) => {
                        const prices = calcCyclePrice(planForm.monthly_price, key, planForm.cycles[key].discount || 0);
                        return (
                        <div key={key} style={{ border: '1px solid ' + (planForm.cycles[key].enabled ? '#6366f1' : '#e2e8f0'), borderRadius: '8px', padding: '0.75rem', background: planForm.cycles[key].enabled ? '#f8f7ff' : '#fafafa', transition: 'all 0.2s' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500, cursor: 'pointer', marginBottom: planForm.cycles[key].enabled ? '0.75rem' : 0 }}>
                            <input type="checkbox" checked={planForm.cycles[key].enabled} onChange={e => updateCycle(key, 'enabled', e.target.checked)} />
                            {cycleLabel(key)}
                            {planForm.cycles[key].enabled && planForm.monthly_price && (
                              <span style={{ marginLeft: 'auto', fontSize: '0.85rem', fontWeight: 600, color: '#6366f1' }}>
                                ₹{prices.display}
                                {prices.original ? <span style={{ textDecoration: 'line-through', color: '#94a3b8', marginLeft: '0.4rem', fontWeight: 400, fontSize: '0.75rem' }}>₹{prices.original}</span> : null}
                              </span>
                            )}
                          </label>
                          {planForm.cycles[key].enabled && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
                              <div className="oa-form-group" style={{ margin: 0 }}>
                                <label style={{ fontSize: '0.75rem' }}>{t('plans.discount')}</label>
                                <input type="number" min="0" max="99" value={planForm.cycles[key].discount} onChange={e => updateCycle(key, 'discount', parseInt(e.target.value) || 0)} placeholder="0" />
                              </div>
                              <div className="oa-form-group" style={{ margin: 0 }}>
                                <label style={{ fontSize: '0.75rem' }}>{t('plans.razorpayPlanId')}</label>
                                <input type="text" value={planForm.cycles[key].razorpay_plan_id} onChange={e => updateCycle(key, 'razorpay_plan_id', e.target.value)} placeholder="plan_XXXXXX" required />
                              </div>
                              {planForm.monthly_price && (
                                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '0.35rem' }}>
                                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                    {t('plans.monthlyEffective', { price: Math.round(prices.display / CYCLE_MONTHS[key]) })}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
                    <button type="submit" className="oa-btn oa-btn-primary">{editingPlanName ? t('plans.updatePlan') : t('plans.createPlan')}</button>
                    <button type="button" className="oa-btn oa-btn-outline" onClick={resetPlanForm}>{t('common.cancel')}</button>
                  </div>
                </form>
              </div>
            )}

            {plansLoading ? (
              <p className="oa-empty">{t('plans.loadingPlans')}</p>
            ) : groupedPlans().length === 0 ? (
              <p className="oa-empty">{t('plans.emptyPlans')}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                {groupedPlans().map(group => (
                  <div key={group.plan_name} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem', background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, fontSize: '1.05rem' }}>{group.plan_name}</span>
                          <span className="oa-badge" style={{ background: '#e0e7ff', color: '#3730a3' }}>
                            {tierLabel(group.plan_tier)}
                          </span>
                          {group.is_popular ? <span className="oa-badge oa-badge-popular">{t('plans.popular')}</span> : null}
                        </div>
                        {group.tagline && (
                          <div style={{ fontSize: '0.8rem', color: '#6366f1', marginTop: '0.2rem', fontStyle: 'italic' }}>
                            {group.tagline}
                          </div>
                        )}
                        {Array.isArray(group.features) && group.features.length > 0 && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>
                            {group.features.slice(0, 3).join(' · ')}{group.features.length > 3 ? t('plans.moreFeatures', { count: group.features.length - 3 }) : ''}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button className="oa-btn-sm oa-btn-edit" onClick={() => handleEditGroupedPlan(group)}>{t('plans.edit')}</button>
                        <button className="oa-btn-sm oa-btn-danger" onClick={() => handleDeleteGroupedPlan(group)}>{t('plans.delete')}</button>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
                      {group.cycles.map(c => (
                        <div key={c.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.6rem 0.75rem' }}>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, marginBottom: '0.25rem' }}>{cycleLabel(c.billing_cycle) || c.billing_cycle}</div>
                          <div style={{ fontWeight: 600, fontSize: '1rem' }}>
                            {c.original_price ? <span style={{ textDecoration: 'line-through', color: '#94a3b8', marginRight: '0.4rem', fontWeight: 400, fontSize: '0.85rem' }}>₹{c.original_price}</span> : null}
                            ₹{c.display_price}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontFamily: 'monospace', marginTop: '0.2rem' }}>{c.razorpay_plan_id}</div>
                          <span className={`oa-badge ${c.is_active ? 'oa-badge-green' : 'oa-badge-red'}`} style={{ marginTop: '0.3rem', display: 'inline-block' }}>
                            {c.is_active ? t('common.active') : t('common.inactive')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'enterprise' && (
        <div className="oa-section">
          <div className="oa-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>{t('enterprise.title', { count: enterpriseSites.length })}</h3>
            </div>

            <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: enterpriseSelectedAssignSite ? '0.75rem' : 0 }}>
                <div style={{ flex: '1 1 250px', position: 'relative' }}>
                  <input
                    type="text"
                    value={enterpriseSearchQuery}
                    onChange={e => handleEnterpriseSearch(e.target.value)}
                    placeholder={t('enterprise.searchPlaceholder')}
                    style={{ width: '100%' }}
                  />
                  {enterpriseSearchResults.length > 0 && !enterpriseSelectedAssignSite && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: '0.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 50, maxHeight: '240px', overflowY: 'auto', marginTop: '0.25rem' }}>
                      {enterpriseSearchResults.map(site => (
                        <div
                          key={site.id}
                          onClick={() => {
                            if (site.is_enterprise) return;
                            setEnterpriseSelectedAssignSite(site);
                            setEnterpriseSearchQuery('');
                            setEnterpriseSearchResults([]);
                          }}
                          style={{ padding: '0.6rem 0.75rem', cursor: site.is_enterprise ? 'default' : 'pointer', borderBottom: '1px solid #f1f5f9', background: site.is_enterprise ? '#f8fafc' : 'white', opacity: site.is_enterprise ? 0.6 : 1 }}
                          onMouseEnter={e => { if (!site.is_enterprise) e.currentTarget.style.background = '#f0f9ff'; }}
                          onMouseLeave={e => { if (!site.is_enterprise) e.currentTarget.style.background = 'white'; }}
                        >
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                            {site.brand_name || site.subdomain}
                            {site.is_enterprise ? <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: '#7c3aed', background: '#ede9fe', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{t('enterprise.alreadyEnterprise')}</span> : null}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{site.subdomain}.{PLATFORM_DOMAIN} &middot; {site.user_email || t('common.noOwner')}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {enterpriseSearchLoading && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>{t('enterprise.searching')}</div>}
                  {enterpriseSearchQuery.length >= 2 && !enterpriseSearchLoading && enterpriseSearchResults.length === 0 && !enterpriseSelectedAssignSite && (
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>{t('enterprise.noSitesFound')}</div>
                  )}
                </div>
              </div>
              {enterpriseSelectedAssignSite && (
                <form onSubmit={handleAssignEnterprise} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', padding: '0.75rem', background: '#f0f9ff', borderRadius: '0.5rem', border: '1px solid #bae6fd' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{enterpriseSelectedAssignSite.brand_name || enterpriseSelectedAssignSite.subdomain}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{enterpriseSelectedAssignSite.subdomain}.{PLATFORM_DOMAIN} &middot; {enterpriseSelectedAssignSite.user_email || t('common.noOwner')}</div>
                  </div>
                  <input
                    type="text"
                    value={enterpriseAssignNotes}
                    onChange={e => setEnterpriseAssignNotes(e.target.value)}
                    placeholder={t('enterprise.notesPlaceholder')}
                    style={{ flex: '0 1 200px', minWidth: '120px' }}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={enterpriseAssignD1GB}
                    onChange={e => setEnterpriseAssignD1GB(e.target.value)}
                    placeholder={t('enterprise.d1Placeholder')}
                    title={t('enterprise.d1Title')}
                    style={{ flex: '0 1 130px', minWidth: '110px' }}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={enterpriseAssignR2GB}
                    onChange={e => setEnterpriseAssignR2GB(e.target.value)}
                    placeholder={t('enterprise.r2Placeholder')}
                    title={t('enterprise.r2Title')}
                    style={{ flex: '0 1 130px', minWidth: '110px' }}
                  />
                  <button type="submit" className="oa-btn oa-btn-primary">{t('enterprise.assignBtn')}</button>
                  <button type="button" className="oa-btn oa-btn-outline" onClick={() => { setEnterpriseSelectedAssignSite(null); setEnterpriseSearchQuery(''); setEnterpriseAssignD1GB(''); setEnterpriseAssignR2GB(''); }}>{t('common.cancel')}</button>
                </form>
              )}
            </div>

            {enterpriseLoading ? (
              <p className="oa-empty">{t('enterprise.loadingSites')}</p>
            ) : enterpriseSites.length === 0 ? (
              <p className="oa-empty">{t('enterprise.emptySites')}</p>
            ) : (
              <>
                <div className="oa-table-wrap">
                  <table className="oa-table">
                    <thead>
                      <tr>
                        <th>{t('enterprise.site')}</th>
                        <th>{t('enterprise.owner')}</th>
                        <th>{t('enterprise.d1Usage')}</th>
                        <th>{t('enterprise.r2Usage')}</th>
                        <th>{t('enterprise.currentOverage')}</th>
                        <th>{t('common.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {enterpriseSites.map(site => (
                        <tr key={site.siteId}>
                          <td data-label={t('enterprise.site')}>
                            <div>{site.brandName || site.subdomain}</div>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{site.subdomain}.{PLATFORM_DOMAIN}</div>
                          </td>
                          <td data-label={t('enterprise.owner')}>
                            <div>{site.userName || '—'}</div>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{site.userEmail}</div>
                          </td>
                          <td data-label="D1">
                            {formatBytes(site.d1Used || 0)} / {formatBytes(site.d1Limit || 0)}
                            {site.d1LimitOverride && <span style={{ display: 'block', fontSize: '0.65rem', color: '#2563eb' }}>{t('enterprise.customQuota')}</span>}
                          </td>
                          <td data-label="R2">
                            {formatBytes(site.r2Used || 0)} / {formatBytes(site.r2Limit || 0)}
                            {site.r2LimitOverride && <span style={{ display: 'block', fontSize: '0.65rem', color: '#2563eb' }}>{t('enterprise.customQuota')}</span>}
                          </td>
                          <td data-label={t('enterprise.currentOverage')}>
                            {(site.currentMonthCost || 0) > 0 ? (
                              <span style={{ color: '#dc2626', fontWeight: 700 }}>₹{(site.currentMonthCost || 0).toFixed(2)}</span>
                            ) : (
                              <span style={{ color: '#10b981' }}>₹0.00</span>
                            )}
                          </td>
                          <td data-label={t('common.actions')}>
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                              <button className="oa-btn-sm oa-btn-edit" onClick={() => loadEnterpriseSiteUsage(site.siteId)}>{t('enterprise.details')}</button>
                              <button className="oa-btn-sm oa-btn-toggle" onClick={() => handleSnapshotUsage(site.siteId)}>{t('enterprise.snapshot')}</button>
                              <button className="oa-btn-sm oa-btn-edit" onClick={() => handleUpdateQuota(site)}>{t('enterprise.quota')}</button>
                              <button className="oa-btn-sm oa-btn-danger" onClick={() => handleRemoveEnterprise(site.siteId)}>{t('common.remove')}</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="oa-card-list-mobile">
                  {enterpriseSites.map(site => (
                    <div className="oa-user-card" key={site.siteId}>
                      <div className="oa-user-card-header">
                        <div>
                          <div className="oa-user-card-name">{site.brandName || site.subdomain}</div>
                          <div className="oa-user-card-email">{site.subdomain}.{PLATFORM_DOMAIN}</div>
                        </div>
                        <span className={`oa-badge ${(site.currentMonthCost || 0) > 0 ? 'oa-badge-red' : 'oa-badge-green'}`}>
                          {(site.currentMonthCost || 0) > 0 ? t('enterprise.overageBadge', { amount: (site.currentMonthCost || 0).toFixed(2) }) : '₹0.00'}
                        </span>
                      </div>
                      <div className="oa-user-card-email">{t('enterprise.ownerLabel', { name: site.userName || '—', email: site.userEmail })}</div>
                      <div className="oa-user-card-email">D1: {formatBytes(site.d1Used || 0)} / {formatBytes(site.d1Limit || 0)} · R2: {formatBytes(site.r2Used || 0)} / {formatBytes(site.r2Limit || 0)}</div>
                      {site.assignedBy && <div className="oa-user-card-date">{t('enterprise.assignedBy', { name: site.assignedBy })}</div>}
                      {site.notes && <div className="oa-user-card-date">{t('enterprise.notesLabel', { notes: site.notes })}</div>}
                      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                        <button className="oa-btn-sm oa-btn-edit" onClick={() => loadEnterpriseSiteUsage(site.siteId)}>{t('enterprise.details')}</button>
                        <button className="oa-btn-sm oa-btn-toggle" onClick={() => handleSnapshotUsage(site.siteId)}>{t('enterprise.snapshot')}</button>
                        <button className="oa-btn-sm oa-btn-edit" onClick={() => handleUpdateQuota(site)}>{t('enterprise.quota')}</button>
                        <button className="oa-btn-sm oa-btn-danger" onClick={() => handleRemoveEnterprise(site.siteId)}>{t('common.remove')}</button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {enterpriseSelectedSite && enterpriseSiteUsage && (
            <div className="oa-card" style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>{t('enterprise.usageDetailsTitle', { name: enterpriseSiteUsage.brandName || enterpriseSiteUsage.subdomain })}</h3>
                <button className="oa-btn oa-btn-outline" onClick={() => { setEnterpriseSelectedSite(null); setEnterpriseSiteUsage(null); }}>{t('common.close')}</button>
              </div>

              {enterpriseUsageLoading ? (
                <p className="oa-empty">{t('enterprise.loadingUsage')}</p>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>{t('enterprise.database')}</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{formatBytes(enterpriseSiteUsage.d1Used)} / {formatBytes(enterpriseSiteUsage.d1Limit)}</div>
                      {enterpriseSiteUsage.d1Overage > 0 && (
                        <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.25rem' }}>{t('enterprise.overageLine', { size: formatBytes(enterpriseSiteUsage.d1Overage), cost: enterpriseSiteUsage.d1CostINR })}</div>
                      )}
                    </div>
                    <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>{t('enterprise.fileStorage')}</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{formatBytes(enterpriseSiteUsage.r2Used)} / {formatBytes(enterpriseSiteUsage.r2Limit)}</div>
                      {enterpriseSiteUsage.r2Overage > 0 && (
                        <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.25rem' }}>{t('enterprise.overageLine', { size: formatBytes(enterpriseSiteUsage.r2Overage), cost: enterpriseSiteUsage.r2CostINR })}</div>
                      )}
                    </div>
                    <div style={{ padding: '1rem', background: enterpriseSiteUsage.currentMonthCost > 0 ? '#fef2f2' : '#f0fdf4', borderRadius: '0.5rem', border: `1px solid ${enterpriseSiteUsage.currentMonthCost > 0 ? '#fecaca' : '#bbf7d0'}` }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>{t('enterprise.currentMonthTotal')}</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: enterpriseSiteUsage.currentMonthCost > 0 ? '#dc2626' : '#10b981' }}>₹{enterpriseSiteUsage.currentMonthCost.toFixed(2)}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <button className="oa-btn oa-btn-primary" onClick={() => handleSnapshotUsage(enterpriseSelectedSite)}>{t('enterprise.snapshotCurrent')}</button>
                  </div>

                  <h4 style={{ marginBottom: '0.75rem' }}>{t('enterprise.invoiceHistory')}</h4>
                  {(!enterpriseSiteUsage.invoices || enterpriseSiteUsage.invoices.length === 0) ? (
                    <p className="oa-empty">{t('enterprise.noInvoices')}</p>
                  ) : (
                    <>
                      <div className="oa-table-wrap">
                        <table className="oa-table">
                          <thead>
                            <tr>
                              <th>{t('enterprise.month')}</th>
                              <th>{t('enterprise.d1Overage')}</th>
                              <th>{t('enterprise.r2Overage')}</th>
                              <th>{t('enterprise.totalCost')}</th>
                              <th>{t('common.status')}</th>
                              <th>{t('common.actions')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {enterpriseSiteUsage.invoices.map(inv => (
                              <tr key={inv.year_month}>
                                <td data-label={t('enterprise.month')}>{inv.year_month}</td>
                                <td data-label="D1">{formatBytes(inv.d1_overage_bytes || 0)} (₹{(inv.d1_cost_inr || 0).toFixed(2)})</td>
                                <td data-label="R2">{formatBytes(inv.r2_overage_bytes || 0)} (₹{(inv.r2_cost_inr || 0).toFixed(2)})</td>
                                <td data-label={t('enterprise.totalCost')} style={{ fontWeight: 700 }}>₹{(inv.total_cost_inr || 0).toFixed(2)}</td>
                                <td data-label={t('common.status')}>
                                  <span className={`oa-badge ${inv.status === 'paid' ? 'oa-badge-green' : 'oa-badge-red'}`}>
                                    {inv.status === 'paid' ? t('enterprise.paid') : t('enterprise.unpaid')}
                                  </span>
                                  {inv.paid_at && <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{new Date(inv.paid_at).toLocaleDateString()}</div>}
                                </td>
                                <td data-label={t('common.actions')}>
                                  {inv.status !== 'paid' && (
                                    <button className="oa-btn-sm oa-btn-edit" onClick={() => handleMarkPaid(enterpriseSelectedSite, inv.year_month)}>{t('enterprise.markPaid')}</button>
                                  )}
                                  {inv.notes && <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.25rem' }}>{inv.notes}</div>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="oa-card-list-mobile">
                        {enterpriseSiteUsage.invoices.map(inv => (
                          <div className="oa-user-card" key={inv.year_month}>
                            <div className="oa-user-card-header">
                              <div className="oa-user-card-name">{inv.year_month}</div>
                              <span className={`oa-badge ${inv.status === 'paid' ? 'oa-badge-green' : 'oa-badge-red'}`}>
                                {inv.status === 'paid' ? t('enterprise.paid') : t('enterprise.unpaid')}
                              </span>
                            </div>
                            <div className="oa-user-card-email">D1: ₹{(inv.d1_cost_inr || 0).toFixed(2)} · R2: ₹{(inv.r2_cost_inr || 0).toFixed(2)}</div>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem', margin: '0.25rem 0' }}>{t('enterprise.totalCost')}: ₹{(inv.total_cost_inr || 0).toFixed(2)}</div>
                            {inv.paid_at && <div className="oa-user-card-date">{t('enterprise.paidLabel', { date: new Date(inv.paid_at).toLocaleDateString() })}</div>}
                            {inv.notes && <div className="oa-user-card-date">{t('enterprise.notesLabel', { notes: inv.notes })}</div>}
                            {inv.status !== 'paid' && (
                              <button className="oa-btn-sm oa-btn-edit" style={{ marginTop: '0.5rem' }} onClick={() => handleMarkPaid(enterpriseSelectedSite, inv.year_month)}>{t('enterprise.markPaid')}</button>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          <div className="oa-card" style={{ marginTop: '1rem' }}>
            <h3>{t('enterprise.ratesTitle')}</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>
              {t('enterprise.ratesDesc')}
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="oa-form-group" style={{ flex: '1 1 200px' }}>
                <label>{t('enterprise.d1RateLabel')}</label>
                <input
                  type="number"
                  step="0.01"
                  value={enterpriseRates.d1PerGB}
                  onChange={e => setEnterpriseRates({ ...enterpriseRates, d1PerGB: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="oa-form-group" style={{ flex: '1 1 200px' }}>
                <label>{t('enterprise.r2RateLabel')}</label>
                <input
                  type="number"
                  step="0.001"
                  value={enterpriseRates.r2PerGB}
                  onChange={e => setEnterpriseRates({ ...enterpriseRates, r2PerGB: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <button className="oa-btn oa-btn-primary" onClick={handleSaveOverageRates}>{t('enterprise.saveRates')}</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="oa-section">
          <div className="oa-card">
            <h3>{t('settings.paymentTitle')}</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>
              {t('settings.paymentDesc')}
            </p>

            {settingsLoading ? (
              <p className="oa-empty">{t('settings.loading')}</p>
            ) : (
              <form onSubmit={handleSettingsSave}>
                <div className="oa-form-group">
                  <label>{t('settings.razorpayKeyId')}</label>
                  <input
                    type="text"
                    value={settingsForm.razorpay_key_id}
                    onChange={e => setSettingsForm({ ...settingsForm, razorpay_key_id: e.target.value })}
                    placeholder={t('settings.razorpayKeyIdPlaceholder')}
                  />
                  <p className="oa-form-hint">{t('settings.razorpayKeyIdHint')}</p>
                </div>
                <div className="oa-form-group" style={{ marginTop: '1rem' }}>
                  <label>{t('settings.razorpayKeySecret')}</label>
                  <input type="text" disabled value="••••••••••••••••" style={{ background: '#f1f5f9' }} />
                  <p className="oa-form-hint">{t('settings.razorpayKeySecretHint')}</p>
                </div>
                <div className="oa-form-group" style={{ marginTop: '1rem' }}>
                  <label>{t('settings.razorpayWebhookSecret')}</label>
                  <input type="text" disabled value="••••••••••••••••" style={{ background: '#f1f5f9' }} />
                  <p className="oa-form-hint">{t('settings.razorpayWebhookSecretHint')}</p>
                </div>
                <button type="submit" className="oa-btn oa-btn-primary" style={{ marginTop: '1rem' }}>{t('settings.saveSettings')}</button>
              </form>
            )}
          </div>

          <div className="oa-card" style={{ marginTop: '1rem' }}>
            <h3>{t('settings.translatorTitle')}</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>
              {t('settings.translatorDescPrefix')}<code>SETTINGS_ENCRYPTION_KEY</code>{t('settings.translatorDescSuffix')}
            </p>
            {settingsLoading ? (
              <p className="oa-empty">{t('settings.loading')}</p>
            ) : (
              <>
                <div className="oa-form-group">
                  <label>{t('settings.region')}</label>
                  <input
                    type="text"
                    value={settingsForm.translator_region || ''}
                    onChange={e => { setSettingsForm({ ...settingsForm, translator_region: e.target.value }); setTranslatorTestResult(null); }}
                    placeholder={t('settings.regionPlaceholder')}
                  />
                  <p className="oa-form-hint">{t('settings.regionHint')}</p>
                </div>
                <div className="oa-form-group" style={{ marginTop: '0.75rem' }}>
                  <label>{t('settings.translatorKey')}</label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={settingsForm.translator_api_key || ''}
                    onChange={e => { setSettingsForm({ ...settingsForm, translator_api_key: e.target.value }); setTranslatorTestResult(null); }}
                    placeholder={settings.translator_api_key_configured ? t('settings.translatorKeyConfigured') : t('settings.translatorKeyEmpty')}
                  />
                  <p className="oa-form-hint">
                    {settings.translator_api_key_configured
                      ? <>{t('settings.translatorStoredPrefix')}<code>{settings.translator_api_key_masked}</code>{t('settings.translatorStoredSuffix')}</>
                      : t('settings.translatorNoKey')}
                  </p>
                </div>
                {translatorTestResult && (
                  <div
                    style={{
                      marginTop: '0.75rem',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      background: translatorTestResult.ok ? '#dcfce7' : '#fee2e2',
                      color: translatorTestResult.ok ? '#166534' : '#991b1b',
                      border: `1px solid ${translatorTestResult.ok ? '#86efac' : '#fca5a5'}`,
                    }}
                  >
                    {translatorTestResult.ok
                      ? <>{t('settings.connectionOkPrefix')}<strong>{translatorTestResult.translation || t('settings.connectionOkFallback')}</strong></>
                      : <>{t('settings.connectionFailedPrefix')}{translatorTestResult.error}{translatorTestResult.status ? t('settings.connectionFailedHttp', { status: translatorTestResult.status }) : ''}</>}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="oa-btn"
                    onClick={handleTranslatorTest}
                    disabled={translatorTesting}
                  >
                    {translatorTesting ? t('settings.testing') : t('settings.testConnection')}
                  </button>
                  <button
                    type="button"
                    className="oa-btn oa-btn-primary"
                    onClick={handleSettingsSave}
                  >
                    {t('settings.saveTranslator')}
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="oa-card" style={{ marginTop: '1rem' }}>
            <h3>{t('settings.enterpriseTitle')}</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>
              {t('settings.enterpriseDesc')}
            </p>
            <div className="oa-form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settingsForm.enterprise_enabled}
                  onChange={e => setSettingsForm({ ...settingsForm, enterprise_enabled: e.target.checked })}
                />
                {t('settings.showEnterprise')}
              </label>
              <p className="oa-form-hint">{t('settings.showEnterpriseHint')}</p>
            </div>
            {settingsForm.enterprise_enabled && (
              <>
                <div className="oa-form-group" style={{ marginTop: '0.75rem' }}>
                  <label>{t('settings.enterpriseMessage')}</label>
                  <textarea
                    rows="3"
                    value={settingsForm.enterprise_message}
                    onChange={e => setSettingsForm({ ...settingsForm, enterprise_message: e.target.value })}
                    placeholder={t('settings.enterpriseMessagePlaceholder')}
                  />
                  <p className="oa-form-hint">{t('settings.enterpriseMessageHint')}</p>
                </div>
                <div className="oa-form-group" style={{ marginTop: '0.75rem' }}>
                  <label>{t('settings.contactEmail')}</label>
                  <input
                    type="email"
                    value={settingsForm.enterprise_email}
                    onChange={e => setSettingsForm({ ...settingsForm, enterprise_email: e.target.value })}
                    placeholder={t('settings.contactEmailPlaceholder', { domain: PLATFORM_DOMAIN })}
                  />
                  <p className="oa-form-hint">{t('settings.contactEmailHint')}</p>
                </div>
              </>
            )}
            <button type="button" className="oa-btn oa-btn-primary" style={{ marginTop: '1rem' }} onClick={handleSettingsSave}>{t('settings.saveEnterprise')}</button>
          </div>

          <div className="oa-card" style={{ marginTop: '1rem' }}>
            <h3>{t('settings.setupTitle')}</h3>
            <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.7 }}>
              <p><strong>{t('settings.setupStepLabel', { n: 1 })}</strong> {t('settings.setupStep1')}</p>
              <p><strong>{t('settings.setupStepLabel', { n: 2 })}</strong> {t('settings.setupStep2')}</p>
              <p><strong>{t('settings.setupStepLabel', { n: 3 })}</strong> {t('settings.setupStep3')}</p>
              <p><strong>{t('settings.setupStepLabel', { n: 4 })}</strong> {t('settings.setupStep4')}</p>
              <p><strong>{t('settings.setupStepLabel', { n: 5 })}</strong> {t('settings.setupStep5')}</p>
              <p><strong>{t('settings.setupStepLabel', { n: 6 })}</strong> {t('settings.setupStep6Prefix')}<code style={{ background: '#f1f5f9', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>https://yourdomain.com/api/payments/webhook</code></p>
              <p><strong>{t('settings.setupStepLabel', { n: 7 })}</strong> {t('settings.setupStep7')}</p>
              <p><strong>{t('settings.setupStepLabel', { n: 8 })}</strong> {t('settings.setupStep8')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
