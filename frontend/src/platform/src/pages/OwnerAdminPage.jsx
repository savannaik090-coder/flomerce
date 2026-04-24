import { useState, useEffect } from 'react';
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
      setError(e.message || "Error loading admin data. Please ensure you are logged in as admin.");
    } finally {
      setDataLoading(false);
    }
  };

  const handleBlockUser = async (userId) => {
    if (!(await confirm({ title: "Block this user?", message: "They will lose access immediately.", variant: 'danger', confirmText: "Block" }))) return;
    try {
      await apiRequest(`/api/admin/users/${userId}/block`, { method: 'POST' });
      await loadAdminData();
      toast.success("User blocked");
    } catch (e) {
      toast.error(`Failed to block user: ${e.message}`);
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
  const CYCLE_LABELS = { 'monthly': 'Monthly', '3months': '3 Months', '6months': '6 Months', 'yearly': 'Yearly' };
  const TIER_LABELS = { 1: 'Tier 1 (Starter)', 2: 'Tier 2 (Growth)', 3: 'Tier 3 (Pro)', 4: 'Tier 4 (Enterprise)' };
  const cycleLabel = (key) => CYCLE_LABELS[key] || key;
  const tierLabel = (tier) => TIER_LABELS[tier] || `Tier ${tier}`;

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
      toast.warning("Please enter a valid monthly price.");
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
        toast.warning("Please enable at least one billing cycle with a Razorpay Plan ID.");
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
      toast.error(`Failed to save plan: ${e.message}`);
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
    if (!(await confirm({ title: "Delete plan?", message: `Delete "${group.plan_name}" and all its billing cycles?`, variant: 'danger', confirmText: "Delete" }))) return;
    try {
      await apiRequest('/api/admin/plans/bulk', { method: 'DELETE', body: JSON.stringify({ plan_name: group.plan_name }) });
      await loadPlans();
      toast.success("Plan deleted");
    } catch (e) {
      toast.error(`Failed to delete plan: ${e.message}`);
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
      toast.success("Settings saved successfully");
      await loadSettings();
    } catch (e) {
      toast.error(`Failed to save settings: ${e.message}`);
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
        toast.success("Microsoft Translator: connection OK");
      } else {
        toast.error(`Translator test failed: ${r.error || "Unknown error"}`);
      }
    } catch (e) {
      const msg = e.message || "Test failed";
      setTranslatorTestResult({ ok: false, error: msg });
      toast.error(`Translator test failed: ${msg}`);
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
        toast.warning("D1 and R2 quotas must be a non-negative number of GB (or blank for plan default).");
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
      toast.error(`Failed to assign: ${e.message}`);
    }
  };

  const handleRemoveEnterprise = async (siteId) => {
    if (!(await confirm({ title: "Remove enterprise status?", message: "This site will be set back to free plan.", variant: 'danger', confirmText: "Remove" }))) return;
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
      toast.error(`Failed to remove: ${e.message}`);
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
      `D1 included quota in GB for ${site.subdomain}
(blank = use enterprise plan default)`,
      currentD1GB
    );
    if (d1Input === null) return;
    const r2Input = window.prompt(
      `R2 included quota in GB for ${site.subdomain}
(blank = use enterprise plan default)`,
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
      toast.warning("Quotas must be a non-negative number of GB (or blank for plan default).");
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
      toast.error(`Failed to update quota: ${e.message}`);
    }
  };

  const handleSnapshotUsage = async (siteId) => {
    if (!(await confirm({ title: "Snapshot usage?", message: "This will record the current month overage charges for this site.", confirmText: "Snapshot" }))) return;
    try {
      await apiRequest('/api/admin/enterprise/snapshot', {
        method: 'POST',
        body: JSON.stringify({ siteId }),
      });
      toast.success("Usage snapshot saved");
      await loadEnterpriseSiteUsage(siteId);
    } catch (e) {
      toast.error(`Failed to snapshot: ${e.message}`);
    }
  };

  const handleMarkPaid = async (siteId, yearMonth) => {
    const notes = window.prompt("Add a payment note (optional):");
    if (notes === null) return;
    try {
      await apiRequest('/api/admin/enterprise/mark-paid', {
        method: 'POST',
        body: JSON.stringify({ siteId, yearMonth, notes: notes || null }),
      });
      await loadEnterpriseSiteUsage(siteId);
    } catch (e) {
      toast.error(`Failed to mark as paid: ${e.message}`);
    }
  };

  const handleSaveOverageRates = async () => {
    try {
      await apiRequest('/api/admin/enterprise/rates', {
        method: 'PUT',
        body: JSON.stringify(enterpriseRates),
      });
      toast.success("Overage rates updated");
    } catch (e) {
      toast.error(`Failed to update rates: ${e.message}`);
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
        toast.success(`Shard created. Note: ${result.note}`);
      } else {
        toast.success("Shard created successfully");
      }
      setNewShardName('');
      setShowCreateShard(false);
      await loadShards();
    } catch (e) {
      toast.error(`Failed to create shard: ${e.message}`);
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
      toast.success("Shard reconciled successfully");
      await refreshSelectedShard();
      if (selectedShard?.id === shardId) {
        await loadShardSites(shardId);
      }
    } catch (e) {
      toast.error(`Reconciliation failed: ${e.message}`);
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
      toast.error(`Failed to set shard active: ${e.message}`);
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
      toast.success("Site moved successfully");
      setShowMoveSite(null);
      setMoveSiteTarget('');
      await refreshSelectedShard();
      if (selectedShard) {
        await loadShardSites(selectedShard.id);
      }
    } catch (e) {
      toast.error(`Failed to move site: ${e.message}`);
    } finally {
      setMovingSite(false);
    }
  };

  const handleDeleteShard = async (shardId, shardName) => {
    if (!(await confirm({ title: "Delete shard?", message: `Delete shard "${shardName}"? This shard must have zero sites.`, variant: 'danger', confirmText: "Delete" }))) return;
    try {
      await apiRequest(`/api/admin/shards/${shardId}`, { method: 'DELETE' });
      toast.success("Shard deleted");
      setSelectedShard(null);
      await loadShards();
    } catch (e) {
      toast.error(`Failed to delete shard: ${e.message}`);
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
        <p>Loading admin panel...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="oa-page">
        <div className="oa-header">
          <h1>Owner Admin Panel</h1>
          <button className="oa-btn oa-btn-outline" onClick={() => navigate('/dashboard')}>Back</button>
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
          <h1>Admin Panel</h1>
          {currentOwner && (
            <p className="oa-owner-info">{`Owner: ${currentOwner.name || currentOwner.email}`}</p>
          )}
        </div>
        <button className="oa-btn oa-btn-outline" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
      </div>

      <div className="oa-tabs">
        <button className={`oa-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
        <button className={`oa-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>Users</button>
        <button className={`oa-tab ${activeTab === 'sites' ? 'active' : ''}`} onClick={() => setActiveTab('sites')}>Websites</button>
        <button className={`oa-tab ${activeTab === 'databases' ? 'active' : ''}`} onClick={() => setActiveTab('databases')}>Databases</button>
        <button className={`oa-tab ${activeTab === 'plans' ? 'active' : ''}`} onClick={() => setActiveTab('plans')}>Plans</button>
        <button className={`oa-tab ${activeTab === 'enterprise' ? 'active' : ''}`} onClick={() => setActiveTab('enterprise')}>Enterprise</button>
        <button className={`oa-tab ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>Settings</button>
        <button className={`oa-tab ${activeTab === 'i18n' ? 'active' : ''}`} onClick={() => setActiveTab('i18n')}>Translations</button>
      </div>

      {activeTab === 'i18n' && <I18nAdminPanel />}

      {activeTab === 'overview' && (
        <div className="oa-overview">
          <div className="oa-stats-grid">
            <div className="oa-stat-card">
              <div className="oa-stat-value">{users.length}</div>
              <div className="oa-stat-label">Total Users</div>
            </div>
            <div className="oa-stat-card">
              <div className="oa-stat-value">{allSites.length}</div>
              <div className="oa-stat-label">Total Websites</div>
            </div>
            <div className="oa-stat-card">
              <div className="oa-stat-value">{totalOrders}</div>
              <div className="oa-stat-label">Total Orders</div>
            </div>
          </div>

          <div className="oa-card">
            <h3>Recent Users</h3>
            <div className="oa-list">
              {users.slice(0, 5).map(u => (
                <div className="oa-list-item" key={u.id || u.email}>
                  <div className="oa-list-info">
                    <span className="oa-list-name">{u.name}</span>
                    <span className="oa-list-sub">{u.email}</span>
                  </div>
                  <span className="oa-badge">{u.plan || "No Plan"}</span>
                </div>
              ))}
              {users.length === 0 && <p className="oa-empty">No users yet</p>}
            </div>
          </div>

          <div className="oa-card">
            <h3>Recent Websites</h3>
            <div className="oa-list">
              {allSites.slice(0, 5).map(s => (
                <div className="oa-list-item" key={s.id || s.subdomain}>
                  <div className="oa-list-info">
                    <span className="oa-list-name">{s.brand_name || s.subdomain}</span>
                    <span className="oa-list-sub">{s.subdomain}.{PLATFORM_DOMAIN}</span>
                  </div>
                  <span className="oa-badge oa-badge-green">Active</span>
                </div>
              ))}
              {allSites.length === 0 && <p className="oa-empty">No websites yet</p>}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="oa-section">
          <div className="oa-card">
            <h3>{`All Users (${users.length})`}</h3>
            <div className="oa-table-wrap">
              <table className="oa-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Plan</th>
                    <th>Joined</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id || u.email}>
                      <td data-label="Name">{u.name}</td>
                      <td data-label="Email">{u.email}</td>
                      <td data-label="Plan"><span className="oa-badge">{u.plan || "No Plan"}</span></td>
                      <td data-label="Joined">{u.created_at ? utcDate(u.created_at).toLocaleDateString() : '-'}</td>
                      <td data-label="Action">
                        {u.email !== currentOwner?.email && (
                          <button className="oa-btn-sm oa-btn-danger" onClick={() => handleBlockUser(u.id)}>Block</button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan="5" className="oa-empty">No users found</td></tr>
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
                    <span className="oa-badge">{u.plan || "No Plan"}</span>
                  </div>
                  <div className="oa-user-card-footer">
                    <span className="oa-user-card-date">{`Joined ${u.created_at ? utcDate(u.created_at).toLocaleDateString() : '-'}`}</span>
                    {u.email !== currentOwner?.email && (
                      <button className="oa-btn-sm oa-btn-danger" onClick={() => handleBlockUser(u.id)}>Block</button>
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
            <h3>{`All Websites (${allSites.length})`}</h3>
            <div className="oa-table-wrap">
              <table className="oa-table">
                <thead>
                  <tr>
                    <th>Site Name</th>
                    <th>Subdomain</th>
                    <th>User ID</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allSites.map(s => (
                    <tr key={s.id || s.subdomain}>
                      <td data-label="Site Name">{s.brand_name || s.subdomain}</td>
                      <td data-label="Subdomain">{s.subdomain}.{PLATFORM_DOMAIN}</td>
                      <td data-label="User ID">{s.user_id}</td>
                      <td data-label="Status"><span className="oa-badge oa-badge-green">Active</span></td>
                    </tr>
                  ))}
                  {allSites.length === 0 && (
                    <tr><td colSpan="4" className="oa-empty">No websites found</td></tr>
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
                    <span className="oa-badge oa-badge-green">Active</span>
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
                ← Back to All Shards
              </button>

              <div className="oa-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{selectedShard.database_name}</h3>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                      Binding: <code>{selectedShard.binding_name}</code> &middot; ID: <code style={{ fontSize: '0.65rem' }}>{selectedShard.database_id}</code>
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {!selectedShard.is_active && (
                      <button className="oa-btn-sm oa-btn-edit" onClick={() => handleSetActive(selectedShard.id)}>Set Active</button>
                    )}
                    <button
                      className="oa-btn-sm oa-btn-toggle"
                      disabled={reconcilingShardId === selectedShard.id}
                      onClick={() => handleReconcileShard(selectedShard.id)}
                    >
                      {reconcilingShardId === selectedShard.id ? "Reconciling..." : "Reconcile"}
                    </button>
                    <button className="oa-btn-sm oa-btn-danger" onClick={() => handleDeleteShard(selectedShard.id, selectedShard.database_name)}>Delete</button>
                  </div>
                </div>

                {selectedShard.bindingAvailable === false && (
                  <div style={{ marginBottom: '1rem', padding: '0.6rem 0.75rem', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '6px', fontSize: '0.78rem', color: '#92400e' }}>
                    <div style={{ fontWeight: 600, marginBottom: '0.3rem' }}>Binding not found in worker environment</div>
                    <div style={{ marginBottom: '0.4rem' }}>{`This shard's D1 database exists but the worker binding ${selectedShard.binding_name} is not available. Sites on this shard will not work until the binding is added.`}</div>
                    <div style={{ marginBottom: '0.3rem' }}>Add this to your wrangler.toml and redeploy the worker:</div>
                    <pre style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '4px', padding: '0.5rem 0.6rem', margin: 0, fontSize: '0.72rem', color: '#78350f', whiteSpace: 'pre-wrap', wordBreak: 'break-all', cursor: 'text', userSelect: 'text' }}>{`[[d1_databases]]\nbinding = "${selectedShard.binding_name}"\ndatabase_name = "${selectedShard.database_name}"\ndatabase_id = "${selectedShard.database_id}"`}</pre>
                  </div>
                )}

                <div className="oa-db-stats-row">
                  <div className="oa-db-stat">
                    <span className="oa-db-stat-label">Size</span>
                    <span className="oa-db-stat-value">{selectedShard.sizeMB} MB</span>
                  </div>
                  <div className="oa-db-stat">
                    <span className="oa-db-stat-label">Sites</span>
                    <span className="oa-db-stat-value">{selectedShard.siteCount}</span>
                  </div>
                  <div className="oa-db-stat">
                    <span className="oa-db-stat-label">Binding</span>
                    <span className={`oa-badge ${selectedShard.bindingAvailable ? 'oa-badge-green' : 'oa-badge-red'}`}>{selectedShard.bindingAvailable ? "Connected" : "Missing"}</span>
                  </div>
                  <div className="oa-db-stat">
                    <span className="oa-db-stat-label">Status</span>
                    <span className={`oa-badge ${selectedShard.is_active ? 'oa-badge-green' : ''}`}>{selectedShard.is_active ? "Active" : "Inactive"}</span>
                  </div>
                  <div className="oa-db-stat">
                    <span className="oa-db-stat-label">Correction Factor</span>
                    <span className="oa-db-stat-value">{selectedShard.correction_factor?.toFixed(2) || '1.00'}</span>
                  </div>
                </div>

                {selectedShard.isNearLimit && (
                  <div className="oa-db-alert">
                    {`Database is approaching the 10GB D1 limit (${selectedShard.sizeAlertGB} GB). Consider creating a new shard.`}
                  </div>
                )}
              </div>

              <div className="oa-card" style={{ marginTop: '1rem' }}>
                <h3>{`Sites on this Shard (${shardSites.length})`}</h3>
                {shardSitesLoading ? (
                  <p className="oa-empty">Loading sites...</p>
                ) : shardSites.length === 0 ? (
                  <p className="oa-empty">No sites on this shard yet</p>
                ) : (
                  <>
                    <div className="oa-table-wrap">
                      <table className="oa-table">
                        <thead>
                          <tr>
                            <th>Site</th>
                            <th>D1 Usage</th>
                            <th>R2 Usage</th>
                            <th>Created</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {shardSites.map(s => (
                            <tr key={s.siteId}>
                              <td data-label="Site">
                                <div style={{ fontWeight: 600 }}>{s.brandName || s.subdomain}</div>
                                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{s.subdomain}.{PLATFORM_DOMAIN}</div>
                              </td>
                              <td data-label="D1">{formatBytes(s.d1BytesDisplayed || 0)}</td>
                              <td data-label="R2">{formatBytes(s.r2BytesUsed || 0)}</td>
                              <td data-label="Created">{s.createdAt ? utcDate(s.createdAt).toLocaleDateString() : '-'}</td>
                              <td data-label="Actions">
                                <button
                                  className="oa-btn-sm oa-btn-edit"
                                  onClick={() => { setShowMoveSite(s); setMoveSiteTarget(''); }}
                                  disabled={shards.length < 2}
                                  title={shards.length < 2 ? "Need at least 2 shards to move sites" : "Move to another shard"}
                                >
                                  Move
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
                              Move
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
                  <h3 style={{ margin: 0 }}>{`Database Shards (${shards.length})`}</h3>
                  <button className="oa-btn oa-btn-primary" onClick={() => setShowCreateShard(true)}>+ New Shard</button>
                </div>

                {showCreateShard && (
                  <div className="oa-plan-form-wrap" style={{ marginBottom: '1rem' }}>
                    <form onSubmit={handleCreateShard}>
                      <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem' }}>Create New Shard Database</h4>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.75rem' }}>
                        This will create a new Cloudflare D1 database, apply the site schema, and register it. New sites will be assigned to the active shard.
                      </p>
                      <div className="oa-form-group">
                        <label>Database Name</label>
                        <input
                          type="text"
                          value={newShardName}
                          onChange={e => setNewShardName(e.target.value)}
                          placeholder="e.g. saas-sites-db-2"
                          required
                          disabled={creatingShardLoading}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                        <button type="submit" className="oa-btn oa-btn-primary" disabled={creatingShardLoading}>
                          {creatingShardLoading ? "Creating..." : "Create Shard"}
                        </button>
                        <button type="button" className="oa-btn oa-btn-outline" onClick={() => { setShowCreateShard(false); setNewShardName(''); }} disabled={creatingShardLoading}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {shardsLoading ? (
                  <p className="oa-empty">Loading shards...</p>
                ) : shards.length === 0 ? (
                  <div className="oa-empty">
                    <p>No database shards created yet.</p>
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Create your first shard to start assigning sites to shared databases.</p>
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
                            <span className="oa-badge oa-badge-green">Active</span>
                          ) : (
                            <span className="oa-badge">Inactive</span>
                          )}
                        </div>
                        <div className="oa-db-stats-row">
                          <div className="oa-db-stat">
                            <span className="oa-db-stat-label">Size</span>
                            <span className="oa-db-stat-value">{shard.sizeMB} MB</span>
                          </div>
                          <div className="oa-db-stat">
                            <span className="oa-db-stat-label">Sites</span>
                            <span className="oa-db-stat-value">{shard.siteCount}</span>
                          </div>
                          <div className="oa-db-stat">
                            <span className="oa-db-stat-label">Factor</span>
                            <span className="oa-db-stat-value">{shard.correction_factor?.toFixed(2) || '1.00'}</span>
                          </div>
                        </div>
                        {shard.isNearLimit && (
                          <div className="oa-db-alert">Near 10GB limit!</div>
                        )}
                        {shard.bindingAvailable === false && (
                          <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.6rem', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '6px', fontSize: '0.72rem', color: '#92400e' }}>
                            <div style={{ fontWeight: 600, marginBottom: '0.3rem' }}>Binding not found in worker</div>
                            <div style={{ marginBottom: '0.3rem' }}>Add this to your wrangler.toml and redeploy:</div>
                            <pre onClick={(e) => e.stopPropagation()} style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '4px', padding: '0.4rem 0.5rem', margin: 0, fontSize: '0.68rem', color: '#78350f', whiteSpace: 'pre-wrap', wordBreak: 'break-all', cursor: 'text', userSelect: 'text' }}>{`[[d1_databases]]\nbinding = "${shard.binding_name}"\ndatabase_name = "${shard.database_name}"\ndatabase_id = "${shard.database_id}"`}</pre>
                          </div>
                        )}
                        <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {!shard.is_active && (
                            <button className="oa-btn-sm oa-btn-edit" onClick={(e) => { e.stopPropagation(); handleSetActive(shard.id); }}>Set Active</button>
                          )}
                          <button
                            className="oa-btn-sm oa-btn-toggle"
                            disabled={reconcilingShardId === shard.id}
                            onClick={(e) => { e.stopPropagation(); handleReconcileShard(shard.id); }}
                          >
                            {reconcilingShardId === shard.id ? "Reconciling..." : "Reconcile"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="oa-card" style={{ marginTop: '1rem' }}>
                <h3>How Shards Work</h3>
                <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.7 }}>
                  <p><strong>Shards</strong> are shared D1 databases that store site-specific data (products, orders, categories, etc.) for multiple sites with row-level isolation.</p>
                  <p><strong>Active Shard:</strong> New sites are automatically assigned to the currently active shard. Only one shard can be active at a time.</p>
                  <p><strong>Reconcile:</strong> Compares estimated usage with actual database size and updates the correction factor for accurate billing.</p>
                  <p><strong>Move Site:</strong> Migrates a site's data from one shard to another. The site is briefly locked during migration.</p>
                  <p><strong>Capacity:</strong> Each D1 database supports up to 10GB. Create a new shard when the current one approaches this limit.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showMoveSite && (
        <div className="oa-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="move-site-title" onClick={() => { if (!movingSite) { setShowMoveSite(null); setMoveSiteTarget(''); } }} onKeyDown={e => { if (e.key === 'Escape' && !movingSite) { setShowMoveSite(null); setMoveSiteTarget(''); } }}>
          <div className="oa-modal" onClick={e => e.stopPropagation()}>
            <h3 id="move-site-title" style={{ margin: '0 0 0.75rem' }}>Move Site</h3>
            <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0 0 1rem' }}>
              Move <strong>{showMoveSite.brandName || showMoveSite.subdomain}</strong> to a different shard database. The site will be briefly locked during migration.
            </p>
            <div className="oa-form-group">
              <label>Target Shard</label>
              <select value={moveSiteTarget} onChange={e => setMoveSiteTarget(e.target.value)} disabled={movingSite}>
                <option value="">Select a shard...</option>
                {shards.filter(s => !selectedShard || s.id !== selectedShard.id).map(s => (
                  <option key={s.id} value={s.id}>{`${s.database_name} (${s.binding_name}) - ${s.sizeMB} MB, ${s.siteCount} sites`}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
              <button className="oa-btn oa-btn-outline" onClick={() => { setShowMoveSite(null); setMoveSiteTarget(''); }} disabled={movingSite}>Cancel</button>
              <button className="oa-btn oa-btn-primary" onClick={handleMoveSite} disabled={!moveSiteTarget || movingSite}>
                {movingSite ? "Moving..." : "Move Site"}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'plans' && (
        <div className="oa-section">
          <div className="oa-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>{`Subscription Plans (${groupedPlans().length})`}</h3>
              <button className="oa-btn oa-btn-primary" onClick={() => { resetPlanForm(); setShowPlanForm(true); }}>
                + Add Plan
              </button>
            </div>

            {showPlanForm && (
              <div className="oa-plan-form-wrap">
                <form onSubmit={handlePlanSubmit} className="oa-plan-form">
                  <h4 style={{ margin: '0 0 1rem' }}>{editingPlanName ? `Edit Plan: ${editingPlanName}` : "Add New Plan"}</h4>
                  <div className="oa-form-grid">
                    <div className="oa-form-group">
                      <label>Plan Name</label>
                      <input type="text" value={planForm.plan_name} onChange={e => setPlanForm({ ...planForm, plan_name: e.target.value })} placeholder="e.g. Starter, Growth, Pro" required />
                    </div>
                    <div className="oa-form-group">
                      <label>Tagline</label>
                      <input type="text" value={planForm.tagline} onChange={e => setPlanForm({ ...planForm, tagline: e.target.value })} placeholder="e.g. Launch your online store" maxLength={80} />
                    </div>
                    <div className="oa-form-group">
                      <label>Plan Tier</label>
                      <select value={planForm.plan_tier} onChange={e => setPlanForm({ ...planForm, plan_tier: parseInt(e.target.value) })}>
                        {[1, 2, 3, 4].map(val => (
                          <option key={val} value={val}>{tierLabel(val)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="oa-form-group">
                      <label>Display Order</label>
                      <input type="number" value={planForm.display_order} onChange={e => setPlanForm({ ...planForm, display_order: e.target.value })} />
                    </div>
                    <div className="oa-form-group oa-form-check">
                      <label>
                        <input type="checkbox" checked={planForm.is_popular} onChange={e => setPlanForm({ ...planForm, is_popular: e.target.checked })} />
                        Mark as Popular
                      </label>
                    </div>
                  </div>
                  <div className="oa-form-group" style={{ marginTop: '0.5rem' }}>
                    <label>Features (one per line)</label>
                    <textarea rows="5" value={planForm.features} onChange={e => setPlanForm({ ...planForm, features: e.target.value })} placeholder={"1 Website\nUnlimited Products\nCustom Domain\n500 MB Database / 5 GB Storage"} />
                    <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: '0.25rem 0 0' }}>These features are shared across all billing cycles of this plan.</p>
                  </div>

                  <div style={{ marginTop: '1rem' }}>
                    <div className="oa-form-group">
                      <label style={{ fontWeight: 600 }}>Monthly Price (₹)</label>
                      <input type="number" step="1" value={planForm.monthly_price} onChange={e => setPlanForm({ ...planForm, monthly_price: e.target.value })} placeholder="e.g. 399" required style={{ maxWidth: '200px' }} />
                      <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: '0.25rem 0 0' }}>This base price is used to auto-calculate all billing cycle totals below.</p>
                    </div>

                    <label style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Billing Cycles</label>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.75rem' }}>Enable the cycles you want. Prices are calculated from the monthly price. Add an optional discount for longer durations.</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {CYCLE_KEYS.map((key) => {
                        const prices = calcCyclePrice(planForm.monthly_price, key, planForm.cycles[key].discount || 0);
                        return (
                        <div key={key} style={{ border: '1px solid ' + (planForm.cycles[key].enabled ? '#6366f1' : '#e2e8f0'), borderRadius: '8px', padding: '0.75rem', background: planForm.cycles[key].enabled ? '#f8f7ff' : '#fafafa', transition: 'all 0.2s' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500, cursor: 'pointer', marginBottom: planForm.cycles[key].enabled ? '0.75rem' : 0 }}>
                            <input type="checkbox" checked={planForm.cycles[key].enabled} onChange={e => updateCycle(key, 'enabled', e.target.checked)} />
                            {cycleLabel(key)}
                            {planForm.cycles[key].enabled && planForm.monthly_price && (
                              <span style={{ marginInlineStart: 'auto', fontSize: '0.85rem', fontWeight: 600, color: '#6366f1' }}>
                                ₹{prices.display}
                                {prices.original ? <span style={{ textDecoration: 'line-through', color: '#94a3b8', marginInlineStart: '0.4rem', fontWeight: 400, fontSize: '0.75rem' }}>₹{prices.original}</span> : null}
                              </span>
                            )}
                          </label>
                          {planForm.cycles[key].enabled && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
                              <div className="oa-form-group" style={{ margin: 0 }}>
                                <label style={{ fontSize: '0.75rem' }}>Discount (%)</label>
                                <input type="number" min="0" max="99" value={planForm.cycles[key].discount} onChange={e => updateCycle(key, 'discount', parseInt(e.target.value) || 0)} placeholder="0" />
                              </div>
                              <div className="oa-form-group" style={{ margin: 0 }}>
                                <label style={{ fontSize: '0.75rem' }}>Razorpay Plan ID</label>
                                <input type="text" value={planForm.cycles[key].razorpay_plan_id} onChange={e => updateCycle(key, 'razorpay_plan_id', e.target.value)} placeholder="plan_XXXXXX" required />
                              </div>
                              {planForm.monthly_price && (
                                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '0.35rem' }}>
                                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                    {`₹${Math.round(prices.display / CYCLE_MONTHS[key])}/mo effective`}
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
                    <button type="submit" className="oa-btn oa-btn-primary">{editingPlanName ? "Update Plan" : "Create Plan"}</button>
                    <button type="button" className="oa-btn oa-btn-outline" onClick={resetPlanForm}>Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {plansLoading ? (
              <p className="oa-empty">Loading plans...</p>
            ) : groupedPlans().length === 0 ? (
              <p className="oa-empty">No plans created yet. Add your first plan above.</p>
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
                          {group.is_popular ? <span className="oa-badge oa-badge-popular">Popular</span> : null}
                        </div>
                        {group.tagline && (
                          <div style={{ fontSize: '0.8rem', color: '#6366f1', marginTop: '0.2rem', fontStyle: 'italic' }}>
                            {group.tagline}
                          </div>
                        )}
                        {Array.isArray(group.features) && group.features.length > 0 && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>
                            {group.features.slice(0, 3).join(' · ')}{group.features.length > 3 ? ` · +${group.features.length - 3} more` : ''}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button className="oa-btn-sm oa-btn-edit" onClick={() => handleEditGroupedPlan(group)}>Edit</button>
                        <button className="oa-btn-sm oa-btn-danger" onClick={() => handleDeleteGroupedPlan(group)}>Delete</button>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
                      {group.cycles.map(c => (
                        <div key={c.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.6rem 0.75rem' }}>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, marginBottom: '0.25rem' }}>{cycleLabel(c.billing_cycle) || c.billing_cycle}</div>
                          <div style={{ fontWeight: 600, fontSize: '1rem' }}>
                            {c.original_price ? <span style={{ textDecoration: 'line-through', color: '#94a3b8', marginInlineEnd: '0.4rem', fontWeight: 400, fontSize: '0.85rem' }}>₹{c.original_price}</span> : null}
                            ₹{c.display_price}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontFamily: 'monospace', marginTop: '0.2rem' }}>{c.razorpay_plan_id}</div>
                          <span className={`oa-badge ${c.is_active ? 'oa-badge-green' : 'oa-badge-red'}`} style={{ marginTop: '0.3rem', display: 'inline-block' }}>
                            {c.is_active ? "Active" : "Inactive"}
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
              <h3 style={{ margin: 0 }}>{`Enterprise Sites (${enterpriseSites.length})`}</h3>
            </div>

            <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: enterpriseSelectedAssignSite ? '0.75rem' : 0 }}>
                <div style={{ flex: '1 1 250px', position: 'relative' }}>
                  <input
                    type="text"
                    value={enterpriseSearchQuery}
                    onChange={e => handleEnterpriseSearch(e.target.value)}
                    placeholder="Search by subdomain or brand name..."
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
                            {site.is_enterprise ? <span style={{ marginInlineStart: '0.5rem', fontSize: '0.7rem', color: '#7c3aed', background: '#ede9fe', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Already Enterprise</span> : null}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{site.subdomain}.{PLATFORM_DOMAIN} &middot; {site.user_email || "No owner"}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {enterpriseSearchLoading && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Searching...</div>}
                  {enterpriseSearchQuery.length >= 2 && !enterpriseSearchLoading && enterpriseSearchResults.length === 0 && !enterpriseSelectedAssignSite && (
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>No sites found</div>
                  )}
                </div>
              </div>
              {enterpriseSelectedAssignSite && (
                <form onSubmit={handleAssignEnterprise} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', padding: '0.75rem', background: '#f0f9ff', borderRadius: '0.5rem', border: '1px solid #bae6fd' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{enterpriseSelectedAssignSite.brand_name || enterpriseSelectedAssignSite.subdomain}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{enterpriseSelectedAssignSite.subdomain}.{PLATFORM_DOMAIN} &middot; {enterpriseSelectedAssignSite.user_email || "No owner"}</div>
                  </div>
                  <input
                    type="text"
                    value={enterpriseAssignNotes}
                    onChange={e => setEnterpriseAssignNotes(e.target.value)}
                    placeholder="Notes (optional)"
                    style={{ flex: '0 1 200px', minWidth: '120px' }}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={enterpriseAssignD1GB}
                    onChange={e => setEnterpriseAssignD1GB(e.target.value)}
                    placeholder="D1 GB (default)"
                    title="D1 included quota in GB. Leave blank to use the enterprise plan default."
                    style={{ flex: '0 1 130px', minWidth: '110px' }}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={enterpriseAssignR2GB}
                    onChange={e => setEnterpriseAssignR2GB(e.target.value)}
                    placeholder="R2 GB (default)"
                    title="R2 included quota in GB. Leave blank to use the enterprise plan default."
                    style={{ flex: '0 1 130px', minWidth: '110px' }}
                  />
                  <button type="submit" className="oa-btn oa-btn-primary">Assign Enterprise</button>
                  <button type="button" className="oa-btn oa-btn-outline" onClick={() => { setEnterpriseSelectedAssignSite(null); setEnterpriseSearchQuery(''); setEnterpriseAssignD1GB(''); setEnterpriseAssignR2GB(''); }}>Cancel</button>
                </form>
              )}
            </div>

            {enterpriseLoading ? (
              <p className="oa-empty">Loading enterprise sites...</p>
            ) : enterpriseSites.length === 0 ? (
              <p className="oa-empty">No enterprise sites assigned yet.</p>
            ) : (
              <>
                <div className="oa-table-wrap">
                  <table className="oa-table">
                    <thead>
                      <tr>
                        <th>Site</th>
                        <th>Owner</th>
                        <th>D1 Usage</th>
                        <th>R2 Usage</th>
                        <th>Current Overage</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {enterpriseSites.map(site => (
                        <tr key={site.siteId}>
                          <td data-label="Site">
                            <div>{site.brandName || site.subdomain}</div>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{site.subdomain}.{PLATFORM_DOMAIN}</div>
                          </td>
                          <td data-label="Owner">
                            <div>{site.userName || '—'}</div>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{site.userEmail}</div>
                          </td>
                          <td data-label="D1">
                            {formatBytes(site.d1Used || 0)} / {formatBytes(site.d1Limit || 0)}
                            {site.d1LimitOverride && <span style={{ display: 'block', fontSize: '0.65rem', color: '#2563eb' }}>custom quota</span>}
                          </td>
                          <td data-label="R2">
                            {formatBytes(site.r2Used || 0)} / {formatBytes(site.r2Limit || 0)}
                            {site.r2LimitOverride && <span style={{ display: 'block', fontSize: '0.65rem', color: '#2563eb' }}>custom quota</span>}
                          </td>
                          <td data-label="Current Overage">
                            {(site.currentMonthCost || 0) > 0 ? (
                              <span style={{ color: '#dc2626', fontWeight: 700 }}>₹{(site.currentMonthCost || 0).toFixed(2)}</span>
                            ) : (
                              <span style={{ color: '#10b981' }}>₹0.00</span>
                            )}
                          </td>
                          <td data-label="Actions">
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                              <button className="oa-btn-sm oa-btn-edit" onClick={() => loadEnterpriseSiteUsage(site.siteId)}>Details</button>
                              <button className="oa-btn-sm oa-btn-toggle" onClick={() => handleSnapshotUsage(site.siteId)}>Snapshot</button>
                              <button className="oa-btn-sm oa-btn-edit" onClick={() => handleUpdateQuota(site)}>Quota</button>
                              <button className="oa-btn-sm oa-btn-danger" onClick={() => handleRemoveEnterprise(site.siteId)}>Remove</button>
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
                          {(site.currentMonthCost || 0) > 0 ? `₹${(site.currentMonthCost || 0).toFixed(2)} overage` : '₹0.00'}
                        </span>
                      </div>
                      <div className="oa-user-card-email">{`Owner: ${site.userName || '—'} (${site.userEmail})`}</div>
                      <div className="oa-user-card-email">D1: {formatBytes(site.d1Used || 0)} / {formatBytes(site.d1Limit || 0)} · R2: {formatBytes(site.r2Used || 0)} / {formatBytes(site.r2Limit || 0)}</div>
                      {site.assignedBy && <div className="oa-user-card-date">{`Assigned by: ${site.assignedBy}`}</div>}
                      {site.notes && <div className="oa-user-card-date">{`Notes: ${site.notes}`}</div>}
                      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                        <button className="oa-btn-sm oa-btn-edit" onClick={() => loadEnterpriseSiteUsage(site.siteId)}>Details</button>
                        <button className="oa-btn-sm oa-btn-toggle" onClick={() => handleSnapshotUsage(site.siteId)}>Snapshot</button>
                        <button className="oa-btn-sm oa-btn-edit" onClick={() => handleUpdateQuota(site)}>Quota</button>
                        <button className="oa-btn-sm oa-btn-danger" onClick={() => handleRemoveEnterprise(site.siteId)}>Remove</button>
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
                <h3 style={{ margin: 0 }}>{`${enterpriseSiteUsage.brandName || enterpriseSiteUsage.subdomain} — Usage Details`}</h3>
                <button className="oa-btn oa-btn-outline" onClick={() => { setEnterpriseSelectedSite(null); setEnterpriseSiteUsage(null); }}>Close</button>
              </div>

              {enterpriseUsageLoading ? (
                <p className="oa-empty">Loading usage...</p>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Database (D1)</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{formatBytes(enterpriseSiteUsage.d1Used)} / {formatBytes(enterpriseSiteUsage.d1Limit)}</div>
                      {enterpriseSiteUsage.d1Overage > 0 && (
                        <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.25rem' }}>{`Overage: ${formatBytes(enterpriseSiteUsage.d1Overage)} (₹${enterpriseSiteUsage.d1CostINR})`}</div>
                      )}
                    </div>
                    <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>File Storage (R2)</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{formatBytes(enterpriseSiteUsage.r2Used)} / {formatBytes(enterpriseSiteUsage.r2Limit)}</div>
                      {enterpriseSiteUsage.r2Overage > 0 && (
                        <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.25rem' }}>{`Overage: ${formatBytes(enterpriseSiteUsage.r2Overage)} (₹${enterpriseSiteUsage.r2CostINR})`}</div>
                      )}
                    </div>
                    <div style={{ padding: '1rem', background: enterpriseSiteUsage.currentMonthCost > 0 ? '#fef2f2' : '#f0fdf4', borderRadius: '0.5rem', border: `1px solid ${enterpriseSiteUsage.currentMonthCost > 0 ? '#fecaca' : '#bbf7d0'}` }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Current Month Total</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: enterpriseSiteUsage.currentMonthCost > 0 ? '#dc2626' : '#10b981' }}>₹{enterpriseSiteUsage.currentMonthCost.toFixed(2)}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <button className="oa-btn oa-btn-primary" onClick={() => handleSnapshotUsage(enterpriseSelectedSite)}>Snapshot Current Month</button>
                  </div>

                  <h4 style={{ marginBottom: '0.75rem' }}>Invoice History</h4>
                  {(!enterpriseSiteUsage.invoices || enterpriseSiteUsage.invoices.length === 0) ? (
                    <p className="oa-empty">No invoices yet. Use "Snapshot" to record current month usage.</p>
                  ) : (
                    <>
                      <div className="oa-table-wrap">
                        <table className="oa-table">
                          <thead>
                            <tr>
                              <th>Month</th>
                              <th>D1 Overage</th>
                              <th>R2 Overage</th>
                              <th>Total Cost</th>
                              <th>Status</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {enterpriseSiteUsage.invoices.map(inv => (
                              <tr key={inv.year_month}>
                                <td data-label="Month">{inv.year_month}</td>
                                <td data-label="D1">{formatBytes(inv.d1_overage_bytes || 0)} (₹{(inv.d1_cost_inr || 0).toFixed(2)})</td>
                                <td data-label="R2">{formatBytes(inv.r2_overage_bytes || 0)} (₹{(inv.r2_cost_inr || 0).toFixed(2)})</td>
                                <td data-label="Total Cost" style={{ fontWeight: 700 }}>₹{(inv.total_cost_inr || 0).toFixed(2)}</td>
                                <td data-label="Status">
                                  <span className={`oa-badge ${inv.status === 'paid' ? 'oa-badge-green' : 'oa-badge-red'}`}>
                                    {inv.status === 'paid' ? "Paid" : "Unpaid"}
                                  </span>
                                  {inv.paid_at && <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{new Date(inv.paid_at).toLocaleDateString()}</div>}
                                </td>
                                <td data-label="Actions">
                                  {inv.status !== 'paid' && (
                                    <button className="oa-btn-sm oa-btn-edit" onClick={() => handleMarkPaid(enterpriseSelectedSite, inv.year_month)}>Mark Paid</button>
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
                                {inv.status === 'paid' ? "Paid" : "Unpaid"}
                              </span>
                            </div>
                            <div className="oa-user-card-email">D1: ₹{(inv.d1_cost_inr || 0).toFixed(2)} · R2: ₹{(inv.r2_cost_inr || 0).toFixed(2)}</div>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem', margin: '0.25rem 0' }}>Total Cost: ₹{(inv.total_cost_inr || 0).toFixed(2)}</div>
                            {inv.paid_at && <div className="oa-user-card-date">{`Paid: ${new Date(inv.paid_at).toLocaleDateString()}`}</div>}
                            {inv.notes && <div className="oa-user-card-date">{`Notes: ${inv.notes}`}</div>}
                            {inv.status !== 'paid' && (
                              <button className="oa-btn-sm oa-btn-edit" style={{ marginTop: '0.5rem' }} onClick={() => handleMarkPaid(enterpriseSelectedSite, inv.year_month)}>Mark Paid</button>
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
            <h3>Overage Rates</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>
              Configure the per-GB overage charges for enterprise sites. These rates are used to calculate monthly overage costs.
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="oa-form-group" style={{ flex: '1 1 200px' }}>
                <label>D1 (Database) — ₹ per GB</label>
                <input
                  type="number"
                  step="0.01"
                  value={enterpriseRates.d1PerGB}
                  onChange={e => setEnterpriseRates({ ...enterpriseRates, d1PerGB: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="oa-form-group" style={{ flex: '1 1 200px' }}>
                <label>R2 (File Storage) — ₹ per GB</label>
                <input
                  type="number"
                  step="0.001"
                  value={enterpriseRates.r2PerGB}
                  onChange={e => setEnterpriseRates({ ...enterpriseRates, r2PerGB: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <button className="oa-btn oa-btn-primary" onClick={handleSaveOverageRates}>Save Rates</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="oa-section">
          <div className="oa-card">
            <h3>Payment Settings</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>
              Manage your Razorpay public key here. The secret key is managed securely via Cloudflare secrets.
            </p>

            {settingsLoading ? (
              <p className="oa-empty">Loading settings...</p>
            ) : (
              <form onSubmit={handleSettingsSave}>
                <div className="oa-form-group">
                  <label>Razorpay Key ID (Public Key)</label>
                  <input
                    type="text"
                    value={settingsForm.razorpay_key_id}
                    onChange={e => setSettingsForm({ ...settingsForm, razorpay_key_id: e.target.value })}
                    placeholder="e.g. rzp_live_XXXXXXXXXX"
                  />
                  <p className="oa-form-hint">This is your Razorpay public key (starts with rzp_live_ or rzp_test_). It is safe to store here as it is meant to be public.</p>
                </div>
                <div className="oa-form-group" style={{ marginTop: '1rem' }}>
                  <label>Razorpay Key Secret</label>
                  <input type="text" disabled value="••••••••••••••••" style={{ background: '#f1f5f9' }} />
                  <p className="oa-form-hint">The secret key is managed via Cloudflare environment secrets (RAZORPAY_KEY_SECRET). Update it in your Cloudflare Workers dashboard.</p>
                </div>
                <div className="oa-form-group" style={{ marginTop: '1rem' }}>
                  <label>Razorpay Webhook Secret</label>
                  <input type="text" disabled value="••••••••••••••••" style={{ background: '#f1f5f9' }} />
                  <p className="oa-form-hint">The webhook secret is managed via Cloudflare environment secrets (RAZORPAY_WEBHOOK_SECRET). Set up a webhook in Razorpay dashboard pointing to your /api/payments/webhook endpoint.</p>
                </div>
                <button type="submit" className="oa-btn oa-btn-primary" style={{ marginTop: '1rem' }}>Save Settings</button>
              </form>
            )}
          </div>

          <div className="oa-card" style={{ marginTop: '1rem' }}>
            <h3>Microsoft Translator</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>
              Platform-paid Microsoft Translator credentials used to power admin-UI translations. The key is encrypted at rest using <code>SETTINGS_ENCRYPTION_KEY</code> and is never returned in plaintext after saving.
            </p>
            {settingsLoading ? (
              <p className="oa-empty">Loading settings...</p>
            ) : (
              <>
                <div className="oa-form-group">
                  <label>Region</label>
                  <input
                    type="text"
                    value={settingsForm.translator_region || ''}
                    onChange={e => { setSettingsForm({ ...settingsForm, translator_region: e.target.value }); setTranslatorTestResult(null); }}
                    placeholder="e.g. centralindia, eastus, global"
                  />
                  <p className="oa-form-hint">Find this in your Azure Translator resource → Keys and Endpoint.</p>
                </div>
                <div className="oa-form-group" style={{ marginTop: '0.75rem' }}>
                  <label>Translator Key</label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={settingsForm.translator_api_key || ''}
                    onChange={e => { setSettingsForm({ ...settingsForm, translator_api_key: e.target.value }); setTranslatorTestResult(null); }}
                    placeholder={settings.translator_api_key_configured ? "A key is configured — paste a new one to replace it" : "Paste your Microsoft Translator key"}
                  />
                  <p className="oa-form-hint">
                    {settings.translator_api_key_configured
                      ? <>Currently stored: <code>{settings.translator_api_key_masked}</code>. Leave the field as-is to keep the existing key.</>
                      : "No key configured yet."}
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
                      ? <>Connection OK. Test translation: <strong>{translatorTestResult.translation || "ok"}</strong></>
                      : <>Failed: {translatorTestResult.error}{translatorTestResult.status ? ` (HTTP ${translatorTestResult.status})` : ''}</>}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="oa-btn"
                    onClick={handleTranslatorTest}
                    disabled={translatorTesting}
                  >
                    {translatorTesting ? "Testing..." : "Test Connection"}
                  </button>
                  <button
                    type="button"
                    className="oa-btn oa-btn-primary"
                    onClick={handleSettingsSave}
                  >
                    Save Translator Settings
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="oa-card" style={{ marginTop: '1rem' }}>
            <h3>Enterprise Plan Settings</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>
              Configure the Enterprise "Contact Us" card shown on the plan selection page.
            </p>
            <div className="oa-form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settingsForm.enterprise_enabled}
                  onChange={e => setSettingsForm({ ...settingsForm, enterprise_enabled: e.target.checked })}
                />
                Show Enterprise plan card
              </label>
              <p className="oa-form-hint">When enabled, an Enterprise "Contact Us" card will appear alongside your regular plans.</p>
            </div>
            {settingsForm.enterprise_enabled && (
              <>
                <div className="oa-form-group" style={{ marginTop: '0.75rem' }}>
                  <label>Enterprise Message</label>
                  <textarea
                    rows="3"
                    value={settingsForm.enterprise_message}
                    onChange={e => setSettingsForm({ ...settingsForm, enterprise_message: e.target.value })}
                    placeholder="e.g. Need a custom solution for your business? Get in touch with our team for tailored enterprise plans."
                  />
                  <p className="oa-form-hint">The message displayed on the Enterprise card. Leave empty for a default message.</p>
                </div>
                <div className="oa-form-group" style={{ marginTop: '0.75rem' }}>
                  <label>Contact Email</label>
                  <input
                    type="email"
                    value={settingsForm.enterprise_email}
                    onChange={e => setSettingsForm({ ...settingsForm, enterprise_email: e.target.value })}
                    placeholder={`e.g. enterprise@${PLATFORM_DOMAIN}`}
                  />
                  <p className="oa-form-hint">The email address for the "Contact Us" button on the Enterprise card.</p>
                </div>
              </>
            )}
            <button type="button" className="oa-btn oa-btn-primary" style={{ marginTop: '1rem' }} onClick={handleSettingsSave}>Save Enterprise Settings</button>
          </div>

          <div className="oa-card" style={{ marginTop: '1rem' }}>
            <h3>Setup Instructions</h3>
            <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.7 }}>
              <p><strong>{`Step ${1}:`}</strong> Go to Razorpay Dashboard → Subscriptions → Plans</p>
              <p><strong>{`Step ${2}:`}</strong> Create plans for each tier and billing cycle (e.g., Starter Monthly, Starter Yearly, etc.)</p>
              <p><strong>{`Step ${3}:`}</strong> Copy the Plan ID (e.g., plan_XXXXXX) for each plan</p>
              <p><strong>{`Step ${4}:`}</strong> Go to the "Plans" tab above and add each plan with its Razorpay Plan ID</p>
              <p><strong>{`Step ${5}:`}</strong> Enter your Razorpay public key above</p>
              <p><strong>{`Step ${6}:`}</strong> In Razorpay Dashboard → Settings → Webhooks, add your webhook URL: <code style={{ background: '#f1f5f9', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>https://yourdomain.com/api/payments/webhook</code></p>
              <p><strong>{`Step ${7}:`}</strong> Select webhook events: subscription.activated, subscription.charged, subscription.cancelled</p>
              <p><strong>{`Step ${8}:`}</strong> Add the webhook secret to Cloudflare as RAZORPAY_WEBHOOK_SECRET</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
