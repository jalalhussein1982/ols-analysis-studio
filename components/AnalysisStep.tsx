
import React, { useState, useCallback, useMemo } from 'react';
import { CleanDataResponse, DescriptiveStats, OlsResult, PlotResponse } from '../types';
import * as api from '../services/apiService';
import Button from './ui/Button';
import Card from './ui/Card';
import Select from './ui/Select';
import Table from './ui/Table';
import Spinner from './ui/Spinner';
import Tooltip from './ui/Tooltip';
import { InfoIcon, DownloadIcon, AlertTriangleIcon } from './icons';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AnalysisStepProps {
    sessionToken: string;
    cleanedData: CleanDataResponse;
}

type AnalysisTab = 'stats' | 'plots' | 'ols';

const AnalysisStep: React.FC<AnalysisStepProps> = ({ sessionToken, cleanedData }) => {
    const [activeTab, setActiveTab] = useState<AnalysisTab>('stats');
    const [dependentVar, setDependentVar] = useState<string>('');
    const [independentVars, setIndependentVars] = useState<string[]>([]);
    const [modelName, setModelName] = useState<string>('Model_1');

    const [stats, setStats] = useState<DescriptiveStats | null>(null);
    const [plots, setPlots] = useState<PlotResponse | null>(null);
    const [olsModels, setOlsModels] = useState<OlsResult[]>([]);
    const [activeOlsModel, setActiveOlsModel] = useState<OlsResult | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const numericColumns = useMemo(() => cleanedData.columns, [cleanedData.columns]);

    const handleRunAnalysis = useCallback(async () => {
        if (!dependentVar || independentVars.length === 0) {
            setError('Please select a dependent variable and at least one independent variable.');
            return;
        }
        setError(null);
        setIsLoading(true);

        try {
            const [statsData, plotData, olsData] = await Promise.all([
                api.getDescriptiveStats(sessionToken, dependentVar, independentVars),
                api.generatePlots(sessionToken, [dependentVar, ...independentVars]),
                api.runOlsAnalysis(sessionToken, dependentVar, independentVars, modelName)
            ]);
            setStats(statsData);
            setPlots(plotData);
            setOlsModels(prev => [...prev, olsData]);
            setActiveOlsModel(olsData);
            setModelName(`Model_${olsModels.length + 2}`);
            setActiveTab('ols');
        } catch (err) {
            setError('An error occurred during analysis.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [sessionToken, dependentVar, independentVars, modelName, olsModels.length]);
    
    const handleIndependentVarChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const options = e.target.options;
        const value: string[] = [];
        for (let i = 0, l = options.length; i < l; i++) {
            if (options[i].selected) {
                value.push(options[i].value);
            }
        }
        setIndependentVars(value);
    };

    const renderTabs = () => (
        <div className="border-b border-slate-200">
            <nav className="-mb-px flex space-x-2" aria-label="Tabs">
                <button
                    onClick={() => setActiveTab('stats')}
                    className={`${activeTab === 'stats' ? 'border-blue-700 text-blue-800 bg-brand-light' : 'border-transparent text-blue-700 bg-brand-light'} whitespace-nowrap py-3 px-4 border-b-2 font-semibold text-sm transition-colors rounded-t-md`}
                >
                    Descriptive Stats
                </button>
                <button
                    onClick={() => setActiveTab('plots')}
                    className={`${activeTab === 'plots' ? 'border-blue-700 text-blue-800 bg-brand-light' : 'border-transparent text-blue-700 bg-brand-light'} whitespace-nowrap py-3 px-4 border-b-2 font-semibold text-sm transition-colors rounded-t-md`}
                >
                    Distribution Plots
                </button>
                <button
                    onClick={() => setActiveTab('ols')}
                    className={`${activeTab === 'ols' ? 'border-blue-700 text-blue-800 bg-brand-light' : 'border-transparent text-blue-700 bg-brand-light'} whitespace-nowrap py-3 px-4 border-b-2 font-semibold text-sm transition-colors rounded-t-md`}
                >
                    OLS Models
                </button>
            </nav>
        </div>
    );

    const renderContent = () => {
        if (isLoading && !stats) {
            return <div className="flex justify-center items-center h-64"><Spinner size="lg"/></div>;
        }

        if (!stats) {
             return <div className="text-center py-12 text-slate-500">Run an analysis to see results here.</div>
        }

        switch(activeTab) {
            case 'stats': return <DescriptiveStatsView stats={stats} sessionToken={sessionToken} />;
            case 'plots': return <PlotsView plots={plots} />;
            case 'ols': return <OlsView models={olsModels} activeModel={activeOlsModel} setActiveModel={setActiveOlsModel} sessionToken={sessionToken} />;
            default: return null;
        }
    };
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
                <Card title="Analysis Configuration">
                    <div className="space-y-4">
                        <Select label="Dependent Variable (Y)" value={dependentVar} onChange={e => setDependentVar(e.target.value)}>
                            <option value="">Select...</option>
                            {numericColumns.map(c => <option key={c} value={c}>{c}</option>)}
                        </Select>

                        <div>
                           <label className="block text-sm font-medium text-slate-700 mb-1">Independent Variables (X)</label>
                            <select multiple value={independentVars} onChange={handleIndependentVarChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-brand-DEFAULT focus:border-brand-DEFAULT sm:text-sm rounded-md h-48">
                                {numericColumns.filter(c => c !== dependentVar).map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        
                        <div>
                             <label htmlFor="modelName" className="block text-sm font-medium text-slate-700">Model Name</label>
                             <input type="text" id="modelName" value={modelName} onChange={e => setModelName(e.target.value)} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm focus:ring-brand-DEFAULT focus:border-brand-DEFAULT sm:text-sm" />
                        </div>

                        <Button onClick={handleRunAnalysis} isLoading={isLoading} className="w-full">
                            Run Analysis
                        </Button>
                        {error && <p className="text-red-600 text-sm">{error}</p>}
                    </div>
                </Card>
            </div>
            <div className="lg:col-span-3">
                <Card>
                    {renderTabs()}
                    <div className="mt-6">
                       {renderContent()}
                    </div>
                </Card>
            </div>
        </div>
    );
};

const DescriptiveStatsView: React.FC<{ stats: DescriptiveStats; sessionToken: string }> = ({ stats, sessionToken }) => {
    const handleExportPDF = () => {
        const doc = new jsPDF();

        // Title
        doc.setFontSize(18);
        doc.text('Descriptive Statistics Report', 14, 20);

        // Date
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

        // Prepare table data
        const tableData = Object.entries(stats).map(([variable, data]) => {
            const statData = data as DescriptiveStats[string];
            return [
                variable,
                statData.mean.toFixed(2),
                statData.median.toFixed(2),
                statData.std_dev.toFixed(2),
                statData.min.toFixed(2),
                statData.max.toFixed(2),
                statData.skewness.toFixed(2),
                statData.kurtosis.toFixed(2),
                statData.outliers_count.toString()
            ];
        });

        // Generate table
        autoTable(doc, {
            head: [['Variable', 'Mean', 'Median', 'Std. Dev.', 'Min', 'Max', 'Skewness', 'Kurtosis', 'Outliers']],
            body: tableData,
            startY: 35,
            theme: 'grid',
            headStyles: { fillColor: [128, 128, 128] }
        });

        // Save PDF
        doc.save(`descriptive_stats_${sessionToken.slice(0, 8)}.pdf`);
    };

    return (
    <div>
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Descriptive Statistics</h3>
            <Button variant="secondary" icon={<DownloadIcon className="w-4 h-4" />} onClick={handleExportPDF}>Export PDF</Button>
        </div>
        <Table headers={['Variable', 'Mean', 'Median', 'Std. Dev.', 'Min', 'Max', 'Skewness', 'Kurtosis', 'Outliers']}>
            {/* FIX: Cast `data` to its correct type to resolve properties being on `unknown`. */}
            {/* `Object.entries` on an object with an index signature returns `[string, unknown][]`. */}
            {Object.entries(stats).map(([variable, data]) => {
                const statData = data as DescriptiveStats[string];
                return (
                <tr key={variable}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{variable}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{statData.mean.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{statData.median.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{statData.std_dev.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{statData.min.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{statData.max.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{statData.skewness.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{statData.kurtosis.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{statData.outliers_count}</td>
                </tr>
                );
            })}
        </Table>
    </div>
    );
};


const PlotsView: React.FC<{ plots: PlotResponse | null }> = ({ plots }) => {
    const [selectedPlot, setSelectedPlot] = useState<string | null>(null);

    // Handle escape key to close modal
    React.useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setSelectedPlot(null);
        };
        if (selectedPlot) {
            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }
    }, [selectedPlot]);

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Distribution Plots</h3>
            </div>
            {plots ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {plots.plot_urls.map((url, i) => (
                        <img
                            key={i}
                            src={url}
                            alt={`Distribution plot ${i+1}`}
                            className="rounded-md shadow-sm cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:scale-[1.02]"
                            onClick={() => setSelectedPlot(url)}
                            title="Click to enlarge"
                        />
                    ))}
                </div>
            ) : <p className="text-slate-500">No plots available.</p>}

            {/* Image Modal */}
            {selectedPlot && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-80 z-50 flex justify-center items-center p-4"
                    onClick={() => setSelectedPlot(null)}
                >
                    <div className="relative max-w-7xl max-h-[95vh] flex flex-col">
                        <button
                            onClick={() => setSelectedPlot(null)}
                            className="absolute -top-10 right-0 text-white hover:text-slate-300 text-2xl font-bold"
                        >
                            ✕
                        </button>
                        <img
                            src={selectedPlot}
                            alt="Enlarged plot"
                            className="max-w-full max-h-[95vh] object-contain rounded-lg"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};


const OlsView: React.FC<{ models: OlsResult[], activeModel: OlsResult | null, setActiveModel: (model: OlsResult) => void, sessionToken: string }> = ({ models, activeModel, setActiveModel, sessionToken }) => {
    const handleExportPDF = () => {
        if (!activeModel) return;

        const doc = new jsPDF();

        // Title
        doc.setFontSize(18);
        doc.text(`OLS Regression Results: ${activeModel.model_name}`, 14, 20);

        // Date
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

        // Model Summary
        doc.setFontSize(12);
        doc.text('Model Summary:', 14, 40);
        doc.setFontSize(10);
        doc.text(`R-squared: ${activeModel.r_squared.toFixed(4)}`, 14, 48);
        doc.text(`Adj. R-squared: ${activeModel.adj_r_squared.toFixed(4)}`, 14, 54);
        doc.text(`F-statistic: ${activeModel.f_statistic.toFixed(4)}`, 14, 60);
        doc.text(`F-statistic p-value: ${activeModel.f_p_value.toFixed(6)}`, 14, 66);

        let yPosition = 74;

        // Warnings
        if (activeModel.warnings.length > 0) {
            doc.setFontSize(12);
            doc.text('Warnings:', 14, yPosition);
            yPosition += 6;
            doc.setFontSize(10);
            activeModel.warnings.forEach(warning => {
                const lines = doc.splitTextToSize(`• ${warning}`, 180);
                doc.text(lines, 14, yPosition);
                yPosition += lines.length * 5;
            });
            yPosition += 4;
        }

        // Coefficients table
        doc.setFontSize(12);
        doc.text('Coefficients:', 14, yPosition);
        yPosition += 8;

        const tableData = Object.entries(activeModel.coefficients).map(([variable, data]) => {
            const coeffData = data as OlsResult['coefficients'][string];
            return [
                variable,
                coeffData.coefficient.toFixed(4),
                coeffData.std_error.toFixed(4),
                coeffData.t_statistic.toFixed(3),
                coeffData.p_value.toFixed(4)
            ];
        });

        autoTable(doc, {
            head: [['Variable', 'Coefficient', 'Std. Error', 't-statistic', 'P>|t|']],
            body: tableData,
            startY: yPosition,
            theme: 'grid',
            headStyles: { fillColor: [128, 128, 128] }
        });

        // Save PDF
        doc.save(`${activeModel.model_name}_${sessionToken.slice(0, 8)}.pdf`);
    };

    return (
    <div className="flex gap-6">
        <div className="w-1/4">
            <h4 className="font-semibold mb-2">Models Run</h4>
            <ul className="space-y-1">
                {models.map(m => (
                    <li key={m.model_name}>
                        <button onClick={() => setActiveModel(m)} className={`w-full text-left p-2 rounded-md text-sm ${activeModel?.model_name === m.model_name ? 'bg-brand-light text-brand-dark font-semibold' : 'hover:bg-slate-100'}`}>
                            {m.model_name}
                        </button>
                    </li>
                ))}
            </ul>
        </div>
        <div className="w-3/4">
            {activeModel ? (
                <div>
                     <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">{activeModel.model_name} Results</h3>
                        <Button variant="secondary" icon={<DownloadIcon className="w-4 h-4" />} onClick={handleExportPDF}>Export PDF</Button>
                    </div>
                    {activeModel.warnings.length > 0 && (
                        <div className="p-4 mb-4 bg-red-50 border border-red-200 rounded-md text-red-800 flex items-start">
                            <AlertTriangleIcon className="w-5 h-5 mr-3 flex-shrink-0"/>
                            <div>
                                <h4 className="font-bold">Model Warnings</h4>
                                {activeModel.warnings.map((w,i) => <p key={i} className="text-sm">{w}</p>)}
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4 mb-6 text-center">
                        <div className="p-4 bg-slate-50 rounded-md">
                            <p className="text-sm text-slate-500">R-squared</p>
                            <p className="text-2xl font-bold">{activeModel.r_squared.toFixed(3)}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-md">
                            <p className="text-sm text-slate-500">Adj. R-squared</p>
                            <p className="text-2xl font-bold">{activeModel.adj_r_squared.toFixed(3)}</p>
                        </div>
                    </div>
                    <Table headers={['Variable', 'Coefficient', 'Std. Error', 't-statistic', 'P>|t|']}>
                        {/* FIX: Cast `data` to its correct type to resolve properties being on `unknown`. */}
                        {/* `Object.entries` on an object with an index signature returns `[string, unknown][]`. */}
                        {Object.entries(activeModel.coefficients).map(([variable, data]) => {
                            const coeffData = data as OlsResult['coefficients'][string];
                            return (
                                <tr key={variable}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{variable}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{coeffData.coefficient.toFixed(4)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{coeffData.std_error.toFixed(4)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{coeffData.t_statistic.toFixed(3)}</td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${coeffData.p_value < 0.05 ? 'text-green-600' : 'text-slate-500'}`}>{coeffData.p_value.toFixed(4)}</td>
                                </tr>
                            );
                        })}
                    </Table>
                </div>
            ) : <p className="text-slate-500">No model selected or run yet.</p>}
        </div>
    </div>
    );
};

export default AnalysisStep;