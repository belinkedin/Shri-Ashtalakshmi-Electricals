
import React, { useState } from 'react';
import {
  BarChart3,
  FileSpreadsheet,
  FileText,
  Download,
  Calendar,
  Filter,
  ArrowUpRight
} from 'lucide-react';
import { callBackend } from '../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ReportCard: React.FC<{
  title: string;
  description: string;
  icon: any;
  color: string;
  onGenerate: (type: 'csv' | 'pdf') => void;
  loading?: boolean;
}> = ({ title, description, icon: Icon, color, onGenerate, loading }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all group cursor-pointer flex flex-col">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <ArrowUpRight className="w-5 h-5 text-slate-300 group-hover:text-slate-900 transition-colors" />
    </div>
    <div className="flex-1">
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      <p className="text-sm text-slate-500 mt-2 leading-relaxed line-clamp-2">{description}</p>
    </div>
    <div className="mt-6 flex gap-2">
      <button
        onClick={(e) => { e.stopPropagation(); onGenerate('csv'); }}
        disabled={loading}
        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${loading ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}
      >
        <FileSpreadsheet className="w-3.5 h-3.5" />
        CSV
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onGenerate('pdf'); }}
        disabled={loading}
        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${loading ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}
      >
        <FileText className="w-3.5 h-3.5" />
        PDF
      </button>
    </div>
  </div>
);

export const Reports: React.FC = () => {
  const [dateRange, setDateRange] = useState('current_month');
  const [loading, setLoading] = useState(false);

  // Helper function to convert data to CSV
  const convertToCSV = (data: any[], headers: string[]) => {
    const csvRows = [];
    // Add headers
    csvRows.push(headers.join(','));

    // Add data rows
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header] || '';
        // Escape quotes and wrap in quotes if contains comma
        const escaped = String(value).replace(/"/g, '""');
        return escaped.includes(',') ? `"${escaped}"` : escaped;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  };

  // Helper function to download file
  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleGenerate = async (reportTitle: string, format: string) => {
    setLoading(true);
    try {
      let data: any[] = [];
      let headers: string[] = [];
      let filename = '';

      // Fetch data based on report type
      if (reportTitle === 'Low Stock Alert') {
        const response = await callBackend<any[]>('getReports', { type: 'LOW_STOCK' });
        data = response;
        headers = ['sku', 'name', 'categoryName', 'stock', 'minStock', 'status', 'price'];
        filename = `low-stock-report-${new Date().toISOString().split('T')[0]}`;
      } else if (reportTitle === 'Inventory Valuation') {
        const response = await callBackend<any>('getProducts', { page: 1, limit: 1000 });
        data = response.data.map((p: any) => ({
          ...p,
          value: p.stock * p.price,
          totalValue: (p.stock * p.price).toFixed(2)
        }));
        headers = ['sku', 'name', 'categoryName', 'stock', 'price', 'totalValue'];
        filename = `inventory-valuation-${new Date().toISOString().split('T')[0]}`;
      } else {
        // For other reports, get all products
        const response = await callBackend<any>('getProducts', { page: 1, limit: 1000 });
        data = response.data;
        headers = ['sku', 'name', 'categoryName', 'stock', 'minStock', 'price', 'status'];
        filename = `${reportTitle.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}`;
      }

      if (format === 'csv') {
        const csv = convertToCSV(data, headers);
        downloadFile(csv, `${filename}.csv`, 'text/csv');
        alert(`✅ ${reportTitle} downloaded successfully!`);
      } else if (format === 'pdf') {
        // Generate PDF
        const doc = new jsPDF();

        // Add title
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(reportTitle, 14, 20);

        // Add metadata
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
        doc.text(`Period: ${dateRange.replace('_', ' ').toUpperCase()}`, 14, 34);

        // Prepare table data
        const tableData = data.map(row =>
          headers.map(header => row[header] || '')
        );

        // Add table
        autoTable(doc, {
          head: [headers.map(h => h.toUpperCase())],
          body: tableData,
          startY: 40,
          styles: {
            fontSize: 8,
            cellPadding: 3,
          },
          headStyles: {
            fillColor: [30, 41, 59], // slate-800
            textColor: [255, 255, 255],
            fontStyle: 'bold',
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252], // slate-50
          },
          margin: { top: 40 },
        });

        // Add footer
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(100);
          doc.text(
            `Page ${i} of ${pageCount}`,
            doc.internal.pageSize.getWidth() / 2,
            doc.internal.pageSize.getHeight() - 10,
            { align: 'center' }
          );
        }

        // Download PDF
        doc.save(`${filename}.pdf`);
        alert(`✅ ${reportTitle} PDF downloaded successfully!`);
      }
    } catch (error: any) {
      alert(`Error generating report: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAll = async () => {
    setLoading(true);
    try {
      const reportConfigs = [
        { title: 'Low Stock Alert', type: 'LOW_STOCK' },
        { title: 'Inventory Valuation', type: 'INVENTORY' },
        { title: 'Movement Summary', type: 'MOVEMENT' },
        { title: 'Top Moving Items', type: 'TOP_MOVING' },
        { title: 'Dormant Inventory', type: 'DORMANT' },
        { title: 'Audit Trail', type: 'AUDIT' }
      ];

      // Ask user for format preference
      const format = confirm('Click OK for PDF or Cancel for CSV') ? 'pdf' : 'csv';

      if (format === 'csv') {
        // Generate merged CSV
        let mergedCSV = '';

        for (const config of reportConfigs) {
          let data: any[] = [];
          let headers: string[] = [];

          // Fetch data based on report type
          if (config.title === 'Low Stock Alert') {
            const response = await callBackend<any[]>('getReports', { type: 'LOW_STOCK' });
            data = response;
            headers = ['sku', 'name', 'categoryName', 'stock', 'minStock', 'status', 'price'];
          } else if (config.title === 'Inventory Valuation') {
            const response = await callBackend<any>('getProducts', { page: 1, limit: 1000 });
            data = response.data.map((p: any) => ({
              ...p,
              totalValue: (p.stock * p.price).toFixed(2)
            }));
            headers = ['sku', 'name', 'categoryName', 'stock', 'price', 'totalValue'];
          } else {
            const response = await callBackend<any>('getProducts', { page: 1, limit: 1000 });
            data = response.data;
            headers = ['sku', 'name', 'categoryName', 'stock', 'minStock', 'price', 'status'];
          }

          // Add section header
          mergedCSV += `\n\n=== ${config.title.toUpperCase()} ===\n`;
          mergedCSV += `Generated: ${new Date().toLocaleString()}\n\n`;

          // Add table
          mergedCSV += convertToCSV(data, headers);
        }

        const filename = `all-reports-${new Date().toISOString().split('T')[0]}.csv`;
        downloadFile(mergedCSV, filename, 'text/csv');
        alert('✅ Merged CSV report downloaded successfully!');

      } else {
        // Generate merged PDF
        const doc = new jsPDF();
        let isFirstReport = true;

        for (const config of reportConfigs) {
          let data: any[] = [];
          let headers: string[] = [];

          // Fetch data
          if (config.title === 'Low Stock Alert') {
            const response = await callBackend<any[]>('getReports', { type: 'LOW_STOCK' });
            data = response;
            headers = ['sku', 'name', 'categoryName', 'stock', 'minStock', 'status', 'price'];
          } else if (config.title === 'Inventory Valuation') {
            const response = await callBackend<any>('getProducts', { page: 1, limit: 1000 });
            data = response.data.map((p: any) => ({
              ...p,
              totalValue: (p.stock * p.price).toFixed(2)
            }));
            headers = ['sku', 'name', 'categoryName', 'stock', 'price', 'totalValue'];
          } else {
            const response = await callBackend<any>('getProducts', { page: 1, limit: 1000 });
            data = response.data;
            headers = ['sku', 'name', 'categoryName', 'stock', 'minStock', 'price', 'status'];
          }

          // Add new page for each report (except first)
          if (!isFirstReport) {
            doc.addPage();
          }
          isFirstReport = false;

          // Add report title
          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold');
          doc.text(config.title, 14, 15);

          // Add metadata
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

          // Prepare table data
          const tableData = data.map(row =>
            headers.map(header => row[header] || '')
          );

          // Add table
          autoTable(doc, {
            head: [headers.map(h => h.toUpperCase())],
            body: tableData,
            startY: 28,
            styles: {
              fontSize: 7,
              cellPadding: 2,
            },
            headStyles: {
              fillColor: [30, 41, 59],
              textColor: [255, 255, 255],
              fontStyle: 'bold',
            },
            alternateRowStyles: {
              fillColor: [248, 250, 252],
            },
            margin: { top: 28 },
          });
        }

        // Add page numbers to all pages
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(100);
          doc.text(
            `Page ${i} of ${pageCount}`,
            doc.internal.pageSize.getWidth() / 2,
            doc.internal.pageSize.getHeight() - 10,
            { align: 'center' }
          );
        }

        const filename = `all-reports-${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(filename);
        alert('✅ Merged PDF report downloaded successfully!');
      }
    } catch (error: any) {
      alert(`Error generating reports: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Date Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 self-start sm:self-auto">
            <Calendar className="w-5 h-5 text-slate-400 shrink-0" />
            Period:
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto overflow-x-auto scrollbar-hide">
            {['today', 'current_month', 'last_month', 'custom'].map((period) => (
              <button
                key={period}
                onClick={() => setDateRange(period)}
                className={`flex-1 sm:flex-none px-4 py-1.5 text-[10px] sm:text-xs font-bold rounded-lg transition-all whitespace-nowrap ${dateRange === period ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {period.replace('_', ' ').toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={handleGenerateAll}
          disabled={loading}
          className={`w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-800'}`}
        >
          <Download className="w-4 h-4" />
          {loading ? 'Generating...' : 'Generate All Reports'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <ReportCard
          title="Low Stock Alert"
          description="List of all products that have reached or fallen below their minimum required stock levels."
          icon={BarChart3}
          color="bg-orange-500"
          onGenerate={(format) => handleGenerate("Low Stock Alert", format)}
          loading={loading}
        />
        <ReportCard
          title="Inventory Valuation"
          description="A detailed financial report calculating the total asset value based on current stock levels and unit prices."
          icon={BarChart3}
          color="bg-blue-500"
          onGenerate={(format) => handleGenerate("Inventory Valuation", format)}
          loading={loading}
        />
        <ReportCard
          title="Movement Summary"
          description="Detailed log of all stock IN and OUT transactions for the selected period, grouped by category."
          icon={BarChart3}
          color="bg-green-500"
          onGenerate={(format) => handleGenerate("Movement Summary", format)}
          loading={loading}
        />
        <ReportCard
          title="Top Moving Items"
          description="Identify your best-selling electrical items and see turnover rates for better procurement planning."
          icon={BarChart3}
          color="bg-purple-500"
          onGenerate={(format) => handleGenerate("Top Moving Items", format)}
          loading={loading}
        />
        <ReportCard
          title="Dormant Inventory"
          description="Items that haven't moved in over 90 days. Useful for identifying dead stock that occupies shelf space."
          icon={BarChart3}
          color="bg-slate-500"
          onGenerate={(format) => handleGenerate("Dormant Inventory", format)}
          loading={loading}
        />
        <ReportCard
          title="Audit Trail"
          description="Complete history of all adjustments and changes made to stock counts by staff and managers."
          icon={BarChart3}
          color="bg-red-500"
          onGenerate={(format) => handleGenerate("Audit Trail", format)}
          loading={loading}
        />
      </div>

      {/* Visual Analytics Placeholder */}
      <div className="bg-slate-900 p-6 sm:p-8 rounded-3xl text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <h2 className="text-xl sm:text-2xl font-bold mb-2">Advanced Analytics</h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Unlock deeper insights with automated trend analysis. Connect your actual sales data to see demand forecasting and seasonal peaks.
            </p>
          </div>
          <button
            onClick={() => alert('Subscription feature: Coming soon!')}
            className="w-full sm:w-auto px-8 py-3 bg-yellow-400 text-slate-900 font-bold rounded-2xl hover:bg-yellow-300 transition-all shadow-lg shadow-yellow-400/20 active:scale-95 shrink-0"
          >
            Activate Pro Features
          </button>
        </div>
      </div>
    </div>
  );
};
