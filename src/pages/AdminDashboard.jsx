import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../hooks/useAdmin';
import { supabase } from '../lib/supabaseClient';
import { 
  ArrowLeft, Database, Cloud, RefreshCw, CheckCircle, XCircle, 
  AlertCircle, Activity, Server, Zap, TrendingUp, Package,
  Play, Square, Loader2, Link as LinkIcon, Table, BarChart3
} from 'lucide-react';
import adminSyncService from '../services/adminSyncService';

const AdminDashboard = () => {
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  
  // State
  const [apiStatuses, setApiStatuses] = useState({});
  const [syncStatuses, setSyncStatuses] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeSyncs, setActiveSyncs] = useState({});
  const [syncProgress, setSyncProgress] = useState({});
  const [showDataMappings, setShowDataMappings] = useState(false);
  const [dataMappings, setDataMappings] = useState({});

  // Redirect if not admin
  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      console.log('⚠️ Admin access denied - redirecting to settings');
      navigate('/settings');
    } else if (!adminLoading && isAdmin) {
      console.log('✅ Admin access granted');
    }
  }, [isAdmin, adminLoading, navigate]);

  // Load data mappings
  useEffect(() => {
    if (isAdmin) {
      const mappings = adminSyncService.getApiDataMappings();
      setDataMappings(mappings);
    }
  }, [isAdmin]);

  // Load all statuses
  useEffect(() => {
    if (isAdmin) {
      loadAllStatuses();
      
      // Set up real-time refresh every 5 seconds for active syncs
      const interval = setInterval(() => {
        const hasActiveSyncs = Object.values(activeSyncs).some(s => s);
        if (hasActiveSyncs) {
          loadAllStatuses();
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [isAdmin, activeSyncs]);

  const loadAllStatuses = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadDatabaseStats(),
        loadTcgcsvSyncStatus(),
        loadScrydexStatus(),
        loadSupabaseStatus()
      ]);
    } catch (error) {
      console.error('Error loading admin dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDatabaseStats = async () => {
    try {
      const [cardsCount, expansionsCount, sealedCount] = await Promise.all([
        supabase.from('pokemon_cards').select('*', { count: 'exact', head: true }),
        supabase.from('pokemon_expansions').select('*', { count: 'exact', head: true }),
        supabase.from('pokemon_sealed_products').select('*', { count: 'exact', head: true }).then(
          result => result,
          error => ({ count: 0, error })
        )
      ]);

      setApiStatuses(prev => ({
        ...prev,
        database: {
          name: 'PostgreSQL Database',
          status: 'connected',
          data: {
            cards: cardsCount.count || 0,
            expansions: expansionsCount.count || 0,
            sealedProducts: sealedCount.count || 0
          },
          note: sealedCount.error ? 'Sealed products table not created yet' : null
        }
      }));
    } catch (error) {
      setApiStatuses(prev => ({
        ...prev,
        database: {
          name: 'PostgreSQL Database',
          status: 'error',
          error: error.message
        }
      }));
    }
  };

  const loadTcgcsvSyncStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('pokemon_sealed_products_sync_status')
        .select('*')
        .eq('id', 1)
        .single();

      if (error) {
        setApiStatuses(prev => ({
          ...prev,
          tcgcsv: {
            name: 'TCGCSV API',
            status: 'pending',
            data: { totalProducts: 0, lastSync: null, groupsSynced: 0 },
            note: 'Run migrations to create sync table'
          }
        }));
        return;
      }

      setApiStatuses(prev => ({
        ...prev,
        tcgcsv: {
          name: 'TCGCSV API',
          status: data.sync_status === 'completed' ? 'connected' : data.sync_status,
          data: {
            totalProducts: data.total_products || 0,
            lastSync: data.last_full_sync || data.last_incremental_sync,
            groupsSynced: data.total_groups_synced || 0
          }
        }
      }));

      setSyncStatuses(prev => ({ ...prev, tcgcsv: data }));
    } catch (error) {
      setApiStatuses(prev => ({
        ...prev,
        tcgcsv: {
          name: 'TCGCSV API',
          status: 'pending',
          error: error.message,
          note: 'Table not created yet'
        }
      }));
    }
  };

  const loadScrydexStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('sync_status')
        .select('*')
        .single();

      if (error) throw error;

      setApiStatuses(prev => ({
        ...prev,
        scrydex: {
          name: 'Scrydex API',
          status: 'connected',
          data: {
            lastCardsSync: data.cards,
            lastExpansionsSync: data.expansions
          }
        }
      }));
    } catch (error) {
      setApiStatuses(prev => ({
        ...prev,
        scrydex: {
          name: 'Scrydex API',
          status: 'unknown',
          error: error.message
        }
      }));
    }
  };

  const loadSupabaseStatus = async () => {
    try {
      const { data, error } = await supabase.from('pokemon_cards').select('id').limit(1);
      
      setApiStatuses(prev => ({
        ...prev,
        supabase: {
          name: 'Supabase',
          status: error ? 'error' : 'connected',
          data: {
            connected: !error,
            endpoint: import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] || 'Unknown'
          }
        }
      }));
    } catch (error) {
      setApiStatuses(prev => ({
        ...prev,
        supabase: {
          name: 'Supabase',
          status: 'error',
          error: error.message
        }
      }));
    }
  };

  // Sync handlers
  const handleStartSync = async (syncType, mode = null) => {
    setActiveSyncs(prev => ({ ...prev, [syncType]: true }));
    
    try {
      let result;
      
      switch (syncType) {
        case 'tcgcsv':
          result = await adminSyncService.startTcgcsvSync(mode || 'recent');
          alert(`${result.message}\n\nThe sync script needs to be run in the terminal for actual data import.`);
          break;
        case 'scrydex-cards':
          result = await adminSyncService.startScrydexCardsSync();
          alert(result.message);
          break;
        case 'scrydex-expansions':
          result = await adminSyncService.startScrydexExpansionsSync();
          alert(result.message);
          break;
        default:
          console.warn('Unknown sync type:', syncType);
      }

      // Reload statuses after a delay
      setTimeout(() => {
        loadAllStatuses();
      }, 2000);
      
    } catch (error) {
      console.error(`Error starting ${syncType} sync:`, error);
      alert(`Sync failed: ${error.message}`);
    } finally {
      setTimeout(() => {
        setActiveSyncs(prev => ({ ...prev, [syncType]: false }));
      }, 2000);
    }
  };

  const handleStopSync = (syncType) => {
    const stopped = adminSyncService.stopSync(syncType);
    if (stopped) {
      setActiveSyncs(prev => ({ ...prev, [syncType]: false }));
      setSyncProgress(prev => ({ ...prev, [syncType]: null }));
    }
  };

  // Progress bar component
  const ProgressBar = ({ progress = 0, status = 'running' }) => {
    const getColorClass = () => {
      switch (status) {
        case 'completed': return 'bg-green-500';
        case 'error': return 'bg-red-500';
        case 'running': return 'bg-indigo-500';
        default: return 'bg-gray-500';
      }
    };

    return (
      <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
        <div 
          className={`h-full ${getColorClass()} transition-all duration-300 ease-out`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    );
  };

  // Status badge
  const getStatusBadge = (status) => {
    const badges = {
      connected: { color: 'bg-green-900/30 text-green-300 border-green-800/30', icon: CheckCircle, text: 'Connected' },
      completed: { color: 'bg-green-900/30 text-green-300 border-green-800/30', icon: CheckCircle, text: 'Active' },
      in_progress: { color: 'bg-blue-900/30 text-blue-300 border-blue-800/30', icon: Activity, text: 'Syncing' },
      running: { color: 'bg-blue-900/30 text-blue-300 border-blue-800/30', icon: Activity, text: 'Running' },
      pending: { color: 'bg-yellow-900/30 text-yellow-300 border-yellow-800/30', icon: AlertCircle, text: 'Pending' },
      error: { color: 'bg-red-900/30 text-red-300 border-red-800/30', icon: XCircle, text: 'Error' },
      unknown: { color: 'bg-gray-800/30 text-gray-400 border-gray-700/30', icon: AlertCircle, text: 'Unknown' }
    };

    const badge = badges[status] || badges.unknown;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs rounded-full font-medium border ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.text}
      </span>
    );
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-2" />
          <p className="text-gray-400">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 pb-20">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
        <div className="px-3 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/settings')}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                title="Back to Settings"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
                <p className="text-xs text-gray-400">System monitoring</p>
              </div>
            </div>
          </div>
          
          {/* Mobile Header Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowDataMappings(!showDataMappings)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm ${showDataMappings ? 'bg-purple-600' : 'bg-gray-700'} hover:bg-purple-700 text-white rounded-lg transition-colors flex-1 justify-center`}
            >
              <LinkIcon className="w-4 h-4" />
              <span className="truncate">{showDataMappings ? 'Hide' : 'Show'} Mappings</span>
            </button>
            <button
              onClick={loadAllStatuses}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-3 py-4 max-w-7xl mx-auto">
        
        {/* Setup Instructions */}
        {(apiStatuses.database?.note || apiStatuses.tcgcsv?.note) && (
          <div className="mb-4 bg-yellow-900/20 border border-yellow-800/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="text-yellow-300 font-medium mb-2">Setup Required</p>
                <p className="text-yellow-200/80 mb-2">
                  The TCGCSV sealed products tables haven't been created yet. Follow these steps:
                </p>
                <ol className="text-yellow-200/80 space-y-1 ml-3 list-decimal text-xs">
                  <li>Run <code className="bg-yellow-900/30 px-1 py-0.5 rounded text-xs">create-pokemon-sealed-products-table.sql</code> in Supabase</li>
                  <li>Run <code className="bg-yellow-900/30 px-1 py-0.5 rounded text-xs">add-tcgcsv-group-id-to-expansions.sql</code> in Supabase</li>
                  <li>Execute <code className="bg-yellow-900/30 px-1 py-0.5 rounded text-xs">node sync-tcgcsv-sealed-products.js --limit=5</code></li>
                  <li>Refresh this dashboard</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* Data Mappings Panel */}
        {showDataMappings && (
          <div className="mb-6 bg-gray-800 border border-purple-700 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-purple-400" />
              API → Database Mappings
            </h2>
            
            <div className="space-y-4">
              {Object.entries(dataMappings).map(([apiKey, apiData]) => (
                <div key={apiKey} className="border border-gray-700 rounded-lg p-3">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
                        <Cloud className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                        <span className="truncate">{apiData.name}</span>
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">{apiData.description}</p>
                    </div>
                    <div className="ml-2 flex-shrink-0">
                      {getStatusBadge(apiStatuses[apiKey]?.status || 'unknown')}
                    </div>
                  </div>

                  {/* Tables */}
                  <div className="mb-3">
                    <h4 className="text-xs font-medium text-gray-300 mb-2 flex items-center gap-2">
                      <Table className="w-3 h-3" />
                      Tables ({apiData.tables.length})
                    </h4>
                    <div className="space-y-2">
                      {apiData.tables.map((table, idx) => (
                        <div key={idx} className="bg-gray-900/50 border border-gray-700 rounded p-2">
                          <div className="flex items-start justify-between mb-1">
                            <div className="flex-1 min-w-0">
                              <code className="text-indigo-300 font-mono text-xs break-all">{table.name}</code>
                              <p className="text-xs text-gray-400 mt-1">{table.description}</p>
                            </div>
                            <span className="text-xs px-2 py-1 bg-gray-800 border border-gray-700 rounded text-gray-300 ml-2 flex-shrink-0">
                              {table.syncType}
                            </span>
                          </div>
                          {table.fields.length > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              <span className="text-gray-400">Fields: </span>
                              <span className="break-all">{table.fields.slice(0, 3).join(', ')}</span>
                              {table.fields.length > 3 && ` +${table.fields.length - 3} more`}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Endpoints */}
                  <div>
                    <h4 className="text-xs font-medium text-gray-300 mb-2 flex items-center gap-2">
                      <Server className="w-3 h-3" />
                      Endpoints ({apiData.endpoints.length})
                    </h4>
                    <div className="space-y-1">
                      {apiData.endpoints.map((endpoint, idx) => (
                        <div key={idx} className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs">
                          <code className="text-blue-300 font-mono break-all">{endpoint.path}</code>
                          <span className="text-gray-400 text-xs sm:ml-2">{endpoint.purpose}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* System Overview */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Server className="w-5 h-5 text-indigo-400" />
            System Overview
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-400 text-xs">Cards</span>
                <Database className="w-3 h-3 text-blue-400" />
              </div>
              <p className="text-lg font-bold text-white">
                {(apiStatuses.database?.data?.cards || 0).toLocaleString()}
              </p>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-400 text-xs">Expansions</span>
                <Package className="w-3 h-3 text-purple-400" />
              </div>
              <p className="text-lg font-bold text-white">
                {(apiStatuses.database?.data?.expansions || 0).toLocaleString()}
              </p>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-400 text-xs">Sealed</span>
                <Package className="w-3 h-3 text-green-400" />
              </div>
              <p className="text-lg font-bold text-white">
                {(apiStatuses.database?.data?.sealedProducts || 0).toLocaleString()}
              </p>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-400 text-xs">APIs</span>
                <Cloud className="w-3 h-3 text-indigo-400" />
              </div>
              <p className="text-lg font-bold text-white">
                {Object.values(apiStatuses).filter(api => api.status === 'connected' || api.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>

        {/* Sync Operations */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            Sync Operations
          </h2>
          
          <div className="space-y-4">
            
            {/* TCGCSV Sync */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
                    <Package className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span className="truncate">TCGCSV Sealed Products</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">Import sealed products and pricing from TCGCSV</p>
                </div>
                <div className="ml-2 flex-shrink-0">
                  {getStatusBadge(apiStatuses.tcgcsv?.status || 'unknown')}
                </div>
              </div>

              {/* Progress Bar */}
              {activeSyncs.tcgcsv && syncProgress.tcgcsv && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-300 truncate flex-1 mr-2">{syncProgress.tcgcsv.message || 'Syncing...'}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">{syncProgress.tcgcsv.progress || 0}%</span>
                  </div>
                  <ProgressBar progress={syncProgress.tcgcsv.progress} status={syncProgress.tcgcsv.status} />
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center">
                  <p className="text-xs text-gray-400">Products</p>
                  <p className="text-sm font-semibold text-white">{(apiStatuses.tcgcsv?.data?.totalProducts || 0).toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400">Groups</p>
                  <p className="text-sm font-semibold text-white">{apiStatuses.tcgcsv?.data?.groupsSynced || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400">Last Sync</p>
                  <p className="text-xs text-white truncate">{formatDate(apiStatuses.tcgcsv?.data?.lastSync)}</p>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="grid grid-cols-1 gap-2">
                {!activeSyncs.tcgcsv ? (
                  <>
                    <button
                      onClick={() => handleStartSync('tcgcsv', 'test')}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
                    >
                      <Play className="w-4 h-4" />
                      Test (5 groups)
                    </button>
                    <button
                      onClick={() => handleStartSync('tcgcsv', 'recent')}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm"
                    >
                      <Play className="w-4 h-4" />
                      Sync Recent (20)
                    </button>
                    <button
                      onClick={() => handleStartSync('tcgcsv', 'full')}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm"
                    >
                      <Zap className="w-4 h-4" />
                      Full Sync (All)
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleStopSync('tcgcsv')}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
                  >
                    <Square className="w-4 h-4" />
                    Stop Sync
                  </button>
                )}
              </div>
            </div>

            {/* Scrydex Cards Sync */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
                    <Database className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span className="truncate">Scrydex Cards Sync</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">Sync Pokemon cards from Scrydex API</p>
                </div>
                <div className="ml-2 flex-shrink-0">
                  {getStatusBadge(apiStatuses.scrydex?.status || 'unknown')}
                </div>
              </div>

              {/* Progress Bar */}
              {activeSyncs['scrydex-cards'] && syncProgress['scrydex-cards'] && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-300 truncate flex-1 mr-2">{syncProgress['scrydex-cards'].message || 'Syncing...'}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">{syncProgress['scrydex-cards'].progress || 0}%</span>
                  </div>
                  <ProgressBar progress={syncProgress['scrydex-cards'].progress} status={syncProgress['scrydex-cards'].status} />
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="text-center">
                  <p className="text-xs text-gray-400">Last Sync</p>
                  <p className="text-xs text-white truncate">{formatDate(apiStatuses.scrydex?.data?.lastCardsSync)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400">Total Cards</p>
                  <p className="text-sm font-semibold text-white">{(apiStatuses.database?.data?.cards || 0).toLocaleString()}</p>
                </div>
              </div>

              {/* Control Buttons */}
              <div>
                {!activeSyncs['scrydex-cards'] ? (
                  <button
                    onClick={() => handleStartSync('scrydex-cards')}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                  >
                    <Play className="w-4 h-4" />
                    Start Sync
                  </button>
                ) : (
                  <button
                    onClick={() => handleStopSync('scrydex-cards')}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
                  >
                    <Square className="w-4 h-4" />
                    Stop Sync
                  </button>
                )}
              </div>
            </div>

            {/* Scrydex Expansions Sync */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
                    <Package className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                    <span className="truncate">Scrydex Expansions Sync</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">Sync expansion sets from Scrydex API</p>
                </div>
                <div className="ml-2 flex-shrink-0">
                  {getStatusBadge(apiStatuses.scrydex?.status || 'unknown')}
                </div>
              </div>

              {/* Progress Bar */}
              {activeSyncs['scrydex-expansions'] && syncProgress['scrydex-expansions'] && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-300 truncate flex-1 mr-2">{syncProgress['scrydex-expansions'].message || 'Syncing...'}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">{syncProgress['scrydex-expansions'].progress || 0}%</span>
                  </div>
                  <ProgressBar progress={syncProgress['scrydex-expansions'].progress} status={syncProgress['scrydex-expansions'].status} />
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="text-center">
                  <p className="text-xs text-gray-400">Last Sync</p>
                  <p className="text-xs text-white truncate">{formatDate(apiStatuses.scrydex?.data?.lastExpansionsSync)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400">Total Expansions</p>
                  <p className="text-sm font-semibold text-white">{(apiStatuses.database?.data?.expansions || 0).toLocaleString()}</p>
                </div>
              </div>

              {/* Control Buttons */}
              <div>
                {!activeSyncs['scrydex-expansions'] ? (
                  <button
                    onClick={() => handleStartSync('scrydex-expansions')}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm"
                  >
                    <Play className="w-4 h-4" />
                    Start Sync
                  </button>
                ) : (
                  <button
                    onClick={() => handleStopSync('scrydex-expansions')}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
                  >
                    <Square className="w-4 h-4" />
                    Stop Sync
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* API Status Summary */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Cloud className="w-5 h-5 text-indigo-400" />
            API Connections
          </h2>
          <div className="grid grid-cols-1 gap-3">
            
            {/* Supabase */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-green-400" />
                  <h3 className="font-semibold text-white">Supabase</h3>
                </div>
                {getStatusBadge(apiStatuses.supabase?.status || 'unknown')}
              </div>
              {apiStatuses.supabase?.data && (
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Endpoint:</span>
                    <span className="text-white font-mono text-xs">{apiStatuses.supabase.data.endpoint}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Connection:</span>
                    <span className="text-green-400">Active</span>
                  </div>
                </div>
              )}
            </div>

            {/* Database */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Server className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-semibold text-white">PostgreSQL</h3>
                </div>
                {getStatusBadge(apiStatuses.database?.status || 'unknown')}
              </div>
              {apiStatuses.database?.data && (
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Cards:</span>
                    <span className="text-white font-semibold">{apiStatuses.database.data.cards?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Expansions:</span>
                    <span className="text-white font-semibold">{apiStatuses.database.data.expansions?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Sealed:</span>
                    <span className="text-white font-semibold">{apiStatuses.database.data.sealedProducts?.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Information Panel */}
        <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="text-blue-300 font-medium mb-1">Admin Dashboard</p>
              <p className="text-blue-200/80">
                Monitor API connections, trigger sync operations, and view real-time progress. 
                TCGCSV updates daily at 20:00 UTC. Click "Show Mappings" to see API links.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
