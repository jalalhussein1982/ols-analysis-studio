
import React, { useState } from 'react';
import { UploadResponse, CleaningDecisions, CleaningDecision } from '../types';
import Button from './ui/Button';
import Card from './ui/Card';
import Table from './ui/Table';
import Select from './ui/Select';
import { AlertTriangleIcon, CheckCircleIcon } from './icons';

interface ValidationStepProps {
    uploadData: UploadResponse;
    onClean: (decisions: CleaningDecisions) => void;
    isLoading: boolean;
}

const ValidationStep: React.FC<ValidationStepProps> = ({ uploadData, onClean, isLoading }) => {
    const [decisions, setDecisions] = useState<CleaningDecisions>({});

    const handleDecisionChange = (column: string, decision: CleaningDecision) => {
        setDecisions(prev => ({ ...prev, [column]: decision }));
    };

    const handleSubmit = () => {
        onClean(decisions);
    };

    const hasIssues = Object.keys(uploadData.validation_results.missing_data).length > 0 || Object.keys(uploadData.validation_results.type_mismatches).length > 0;

    return (
        <div className="space-y-6">
            <Card title="Data Validation Summary">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div>
                        <p className="text-sm text-slate-500">Total Rows</p>
                        <p className="text-2xl font-bold text-slate-800">{uploadData.row_count}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">Columns with Missing Data</p>
                        <p className="text-2xl font-bold text-yellow-600">{Object.keys(uploadData.validation_results.missing_data).length}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">Columns with Type Mismatches</p>
                        <p className="text-2xl font-bold text-orange-600">{Object.keys(uploadData.validation_results.type_mismatches).length}</p>
                    </div>
                </div>
            </Card>

            {hasIssues ? (
                <Card title="Data Cleaning Actions">
                    <p className="mb-4 text-sm text-slate-600">Please select a cleaning action for each column with identified issues. Cleaned data will be used for analysis.</p>
                    <div className="space-y-4">
                        {Object.entries(uploadData.validation_results.missing_data).map(([col, count]) => (
                            <div key={col} className="p-4 bg-yellow-50 border border-yellow-200 rounded-md flex items-center justify-between">
                                <div>
                                    <h4 className="font-semibold text-yellow-800">{col}</h4>
                                    <p className="text-sm text-yellow-700">{count} missing values</p>
                                </div>
                                <Select onChange={(e) => handleDecisionChange(col, e.target.value as CleaningDecision)} className="w-64">
                                    <option>Select action...</option>
                                    <option value="delete_rows">Delete Rows</option>
                                    <option value="impute_mean">Impute Mean</option>
                                    <option value="impute_median">Impute Median</option>
                                    <option value="forward_fill">Forward Fill</option>
                                    <option value="drop_column">Drop Column</option>
                                </Select>
                            </div>
                        ))}
                         {Object.entries(uploadData.validation_results.type_mismatches).map(([col, rows]) => (
                            <div key={col} className="p-4 bg-orange-50 border border-orange-200 rounded-md flex items-center justify-between">
                                <div>
                                    <h4 className="font-semibold text-orange-800">{col}</h4>
                                    {/* FIX: Cast `rows` to `number[]` to access the `length` property, as Object.entries infers it as `unknown`. */}
                                    <p className="text-sm text-orange-700">{(rows as number[]).length} type mismatches (non-numeric)</p>
                                </div>
                                <Select onChange={(e) => handleDecisionChange(col, e.target.value as CleaningDecision)} className="w-64">
                                    <option>Select action...</option>
                                    <option value="convert_to_numeric">Convert to Numeric (errors become NaN)</option>
                                    <option value="delete_rows">Delete Rows with Mismatches</option>
                                    <option value="drop_column">Drop Column</option>
                                </Select>
                            </div>
                        ))}
                    </div>
                     <div className="mt-6 flex justify-end">
                        <Button onClick={handleSubmit} isLoading={isLoading}>Apply Cleaning & Proceed</Button>
                    </div>
                </Card>
            ) : (
                <div className="text-center p-8 bg-green-50 border border-green-200 rounded-md">
                    <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto" />
                    <h3 className="mt-2 text-xl font-semibold text-green-800">No data issues found!</h3>
                    <p className="text-slate-600 mt-1">Your dataset is clean and ready for analysis.</p>
                    <Button onClick={() => onClean({})} isLoading={isLoading} className="mt-4">
                        Proceed to Analysis
                    </Button>
                </div>
            )}

            <Card title="Data Preview (First 10 Rows)">
                <Table headers={uploadData.columns}>
                    {uploadData.preview.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                            {uploadData.columns.map((col, colIndex) => (
                                <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                    {row[col] === null ? <span className="text-yellow-600 italic">NULL</span> : String(row[col])}
                                </td>
                            ))}
                        </tr>
                    ))}
                </Table>
            </Card>
        </div>
    );
};

export default ValidationStep;