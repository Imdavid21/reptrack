import { useRef, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Collapse,
  Checkbox,
  FormControlLabel,
  Alert,
  LinearProgress,
} from '@mui/material';
import { 
  Download, 
  Upload, 
  ChevronRight,
  Loader2,
  Database,
  FileSpreadsheet,
} from 'lucide-react';
import { MuiCard } from '@/components/ui/MuiCard';
import { useDataExport, DataTable } from '@/hooks/useDataExport';
import { toast } from '@/lib/toast';

interface DataManagementSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
}

const TABLE_LABELS: Record<DataTable, string> = {
  workouts: 'Workouts',
  exercise_sets: 'Exercise Sets',
  daily_metrics: 'Daily Metrics',
  water_logs: 'Water Logs',
  meals: 'Meals',
};

export function DataManagementSection({ isExpanded, onToggle }: DataManagementSectionProps) {
  const {
    exportToCSV,
    exportAllData,
    importFromCSV,
    isExporting,
    isImporting,
    progress,
    lastExport,
    downloadLastExport,
    clearLastExport,
  } = useDataExport();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedTables, setSelectedTables] = useState<DataTable[]>([
    'workouts', 'exercise_sets', 'daily_metrics', 'water_logs', 'meals'
  ]);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    imported: Record<string, number>;
    errors: string[];
  } | null>(null);

  const handleTableToggle = (table: DataTable) => {
    setSelectedTables(prev => 
      prev.includes(table) 
        ? prev.filter(t => t !== table)
        : [...prev, table]
    );
  };

  const handleExport = async () => {
    try {
      if (selectedTables.length === 0) {
        toast.error('Select at least one table to export');
        return;
      }
      const result = await exportToCSV({ tables: selectedTables });
      if (!result) {
        toast.info('No data found to export');
        return;
      }
      toast.success('Data exported successfully');
    } catch (error: any) {
      toast.error(error.message || 'Export failed');
    }
  };

  const handleExportAll = async () => {
    try {
      const result = await exportAllData();
      if (!result) {
        toast.info('No data found to export');
        return;
      }
      toast.success('All data exported successfully');
    } catch (error: any) {
      toast.error(error.message || 'Export failed');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImportResult(null);
    
    try {
      const result = await importFromCSV(file);
      setImportResult(result);
      
      if (result.success) {
        const totalImported = Object.values(result.imported).reduce((a, b) => a + b, 0);
        toast.success(`Imported ${totalImported} records`);
      } else if (result.errors.length > 0) {
        toast.error(result.errors[0]);
      }
    } catch (error: any) {
      toast.error(error.message || 'Import failed');
    }
    
    // Reset file input
    e.target.value = '';
  };

  const isLoading = isExporting || isImporting;

  return (
    <MuiCard>
      <Box
        onClick={onToggle}
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          cursor: 'pointer',
          py: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Database size={18} />
          <Typography variant="body1" fontWeight={600}>Data Management</Typography>
        </Box>
        <ChevronRight 
          size={18} 
          style={{ 
            transform: isExpanded ? 'rotate(90deg)' : 'none',
            transition: 'transform 0.2s',
          }} 
        />
      </Box>
      
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        Export or import your fitness data as CSV
      </Typography>
      
      <Collapse in={isExpanded}>
        <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
          
          {/* Progress indicator */}
          {isLoading && (
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {isExporting ? 'Exporting' : 'Importing'} {progress.table}...
              </Typography>
              <LinearProgress 
                variant="determinate" 
                 value={progress.total ? (progress.current / progress.total) * 100 : 0} 
                sx={{ mt: 1, borderRadius: 1 }}
              />
            </Box>
          )}

          {/* Export Section */}
          <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Download size={16} />
              <Typography variant="body2" fontWeight={600}>Export Data</Typography>
            </Box>
            
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Select tables to include in your export:
            </Typography>
            
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0.5 }}>
              {(Object.keys(TABLE_LABELS) as DataTable[]).map(table => (
                <FormControlLabel
                  key={table}
                  control={
                    <Checkbox
                      size="small"
                      checked={selectedTables.includes(table)}
                      onChange={() => handleTableToggle(table)}
                    />
                  }
                  label={
                    <Typography variant="caption">{TABLE_LABELS[table]}</Typography>
                  }
                />
              ))}
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <Button
                fullWidth
                variant="outlined"
                disabled={isLoading || selectedTables.length === 0}
                startIcon={isExporting ? <Loader2 className="animate-spin" size={16} /> : <FileSpreadsheet size={16} />}
                onClick={handleExport}
              >
                Export Selected
              </Button>
              <Button
                fullWidth
                variant="contained"
                disabled={isLoading}
                startIcon={isExporting ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                onClick={handleExportAll}
              >
                Export All
              </Button>
            </Box>

            {/* Download fallback (some browsers block automatic downloads after async work) */}
            {lastExport && (
              <Alert severity="success" sx={{ mt: 2, fontSize: '0.75rem' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                  <Box>
                    <strong>Export ready:</strong> {lastExport.filename}
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      If the download didn't start automatically, click Download.
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                    <Button size="small" variant="contained" onClick={downloadLastExport}>
                      Download
                    </Button>
                    <Button size="small" variant="outlined" onClick={clearLastExport}>
                      Clear
                    </Button>
                  </Box>
                </Box>
              </Alert>
            )}
          </Box>

          {/* Import Section */}
          <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Upload size={16} />
              <Typography variant="body2" fontWeight={600}>Import Data</Typography>
            </Box>
            
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Import a previously exported CSV file. New records will be added (existing data won't be overwritten).
            </Typography>
            
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            
            <Button
              fullWidth
              variant="outlined"
              disabled={isLoading}
              startIcon={isImporting ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
              onClick={handleImportClick}
            >
              Select CSV File
            </Button>
            
            {/* Import result */}
            {importResult && (
              <Box sx={{ mt: 2 }}>
                {importResult.success ? (
                  <Alert severity="success" sx={{ fontSize: '0.75rem' }}>
                    <strong>Import complete!</strong>
                    <Box component="ul" sx={{ m: 0, pl: 2, mt: 0.5 }}>
                      {Object.entries(importResult.imported).map(([table, count]) => (
                        <li key={table}>{TABLE_LABELS[table as DataTable] || table}: {count} records</li>
                      ))}
                    </Box>
                  </Alert>
                ) : (
                  <Alert severity="warning" sx={{ fontSize: '0.75rem' }}>
                    <strong>Import completed with errors:</strong>
                    <Box component="ul" sx={{ m: 0, pl: 2, mt: 0.5 }}>
                      {importResult.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </Box>
                    {Object.keys(importResult.imported).length > 0 && (
                      <>
                        <strong>Successfully imported:</strong>
                        <Box component="ul" sx={{ m: 0, pl: 2, mt: 0.5 }}>
                          {Object.entries(importResult.imported).map(([table, count]) => (
                            <li key={table}>{TABLE_LABELS[table as DataTable] || table}: {count} records</li>
                          ))}
                        </Box>
                      </>
                    )}
                  </Alert>
                )}
              </Box>
            )}
          </Box>

          {/* Info */}
          <Alert severity="info" sx={{ fontSize: '0.75rem' }}>
            <strong>Tip:</strong> Export your data regularly as a backup. You can re-import it to restore or transfer to another account.
          </Alert>
        </Box>
      </Collapse>
    </MuiCard>
  );
}
