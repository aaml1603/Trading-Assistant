'use client';

import { useState } from 'react';

interface ChartAnalysisProps {
  strategy: string;
  hasStrategy: boolean;
}

interface ChartData {
  file: File;
  previewUrl: string;
  timeframe: string;
}

export default function ChartAnalysis({ strategy, hasStrategy }: ChartAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [charts, setCharts] = useState<ChartData[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newCharts = files.map(file => ({
      file,
      previewUrl: URL.createObjectURL(file),
      timeframe: '', // User will fill this in
    }));

    setCharts(prev => [...prev, ...newCharts]);
    setError(null);

    // Reset file input
    e.target.value = '';
  };

  const handleTimeframeChange = (index: number, timeframe: string) => {
    setCharts(prev => prev.map((chart, i) =>
      i === index ? { ...chart, timeframe } : chart
    ));
  };

  const removeChart = (index: number) => {
    setCharts(prev => {
      const newCharts = [...prev];
      URL.revokeObjectURL(newCharts[index].previewUrl);
      newCharts.splice(index, 1);
      return newCharts;
    });
  };

  const handleAnalyze = async () => {
    if (charts.length === 0) return;

    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null);

    try {
      const formData = new FormData();

      // Append all chart files
      charts.forEach((chart, index) => {
        formData.append(`chart_${index}`, chart.file);
        formData.append(`timeframe_${index}`, chart.timeframe);
      });

      formData.append('chartCount', charts.length.toString());
      formData.append('strategy', strategy);

      const response = await fetch('/api/analyze-chart', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze charts');
      }

      setAnalysis(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze charts');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    charts.forEach(chart => URL.revokeObjectURL(chart.previewUrl));
    setCharts([]);
    setAnalysis(null);
    setError(null);
  };

  if (!hasStrategy) {
    return (
      <div className="w-full p-10 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <p className="text-sm text-gray-600 font-medium">
            Please upload a trading strategy first
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Upload Area */}
      <div className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-all ${
        isAnalyzing ? 'border-indigo-400 bg-indigo-50' : charts.length > 0 ? 'border-indigo-500 bg-indigo-50/50' : 'border-gray-300 bg-white hover:border-indigo-500 hover:bg-indigo-50/50'
      }`}>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          disabled={isAnalyzing}
          className="hidden"
          id="chart-upload"
          multiple
        />
        <label
          htmlFor="chart-upload"
          className={`cursor-pointer block ${isAnalyzing ? 'pointer-events-none' : ''}`}
        >
          <div className="flex flex-col items-center">
            <div className={`w-16 h-16 bg-gradient-to-br rounded-full flex items-center justify-center mb-4 ${
              charts.length > 0 ? 'from-green-100 to-emerald-100' : 'from-indigo-100 to-purple-100'
            }`}>
              <svg className={`w-8 h-8 ${charts.length > 0 ? 'text-green-600' : 'text-indigo-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {charts.length > 0 ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                )}
              </svg>
            </div>
            <p className="text-base font-semibold text-gray-900">
              {charts.length > 0 ? 'Add more chart screenshots' : 'Upload chart screenshots'}
            </p>
            <p className="mt-2 text-sm text-gray-600">
              {charts.length > 0 ? `${charts.length} chart${charts.length > 1 ? 's' : ''} selected` : 'Support multiple timeframes'}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              PNG, JPG, or GIF • Click or drag to add
            </p>
          </div>
        </label>
      </div>

      {/* Chart List */}
      {charts.length > 0 && !isAnalyzing && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-700">Uploaded Charts ({charts.length})</h4>
            <button
              onClick={handleReset}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Clear all
            </button>
          </div>

          {charts.map((chart, index) => (
            <div key={index} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
                {/* Chart Preview */}
                <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={chart.previewUrl}
                    alt={`Chart ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => removeChart(index)}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Chart Info */}
                <div className="md:col-span-2 flex flex-col justify-center space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Chart {index + 1} - Timeframe
                    </label>
                    <input
                      type="text"
                      value={chart.timeframe}
                      onChange={(e) => handleTimeframeChange(index, e.target.value)}
                      placeholder="e.g., 1H, 4H, Daily, Weekly"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    File: {chart.file.name}
                  </p>
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || charts.some(c => !c.timeframe.trim())}
            className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {charts.some(c => !c.timeframe.trim()) ? 'Please specify all timeframes' : 'Analyze Charts'}
          </button>
        </div>
      )}

      {/* Loading State */}
      {isAnalyzing && (
        <div className="p-8 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
          <div className="flex items-center justify-center space-x-3">
            <div className="w-6 h-6 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-base font-medium text-indigo-700">Analyzing {charts.length} chart{charts.length > 1 ? 's' : ''} with AI...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3">
          <svg className="w-5 h-5 text-red-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">Analysis Failed</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Analysis Result */}
      {analysis && !isAnalyzing && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <h3 className="text-lg font-bold text-green-900">Analysis Complete</h3>
            </div>
            <button
              onClick={handleReset}
              className="text-sm text-green-700 hover:text-green-800 font-medium transition-colors"
            >
              Analyze new charts
            </button>
          </div>
          <div className="bg-white rounded-lg p-5 border border-green-100">
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
              {analysis}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
