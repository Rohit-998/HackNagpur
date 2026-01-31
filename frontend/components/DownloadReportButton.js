import React from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const DownloadReportButton = ({ patient, history, alerts, className }) => {

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    // --- Styles ---
    const primaryColor = [6, 182, 212]; // Cyan-500
    const darkColor = [15, 23, 42]; // Slate-900

    // --- Header ---
    doc.setFillColor(...darkColor);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('HT-1 TRIAGE UNIT', 15, 20);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Patient Clinical Assessment Report', 15, 30);
    
    doc.text(new Date().toLocaleString(), pageWidth - 15, 30, { align: 'right' });

    // --- Patient Details ---
    let yPos = 55;
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Patient Demographics', 15, yPos);
    
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.line(15, yPos + 3, 80, yPos + 3);
    
    yPos += 15;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${patient.full_name || 'N/A'}`, 15, yPos);
    doc.text(`Age/Sex: ${patient.age}Y / ${patient.sex}`, 15, yPos + 8);
    // Use fallback ID if needed
    doc.text(`ID: ${patient.device_patient_id || patient.id}`, 80, yPos); 
    doc.text(`Arrival: ${new Date(patient.arrival_ts).toLocaleString()}`, 80, yPos + 8);

    // Only show score if available
    doc.setFillColor(...(patient.triage_score >= 85 ? [239, 68, 68] : patient.triage_score >= 50 ? [245, 158, 11] : [16, 185, 129]));
    doc.roundedRect(pageWidth - 60, yPos - 5, 45, 20, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`${patient.triage_score}`, pageWidth - 37.5, yPos + 3, { align: 'center' });
    doc.setFontSize(8);
    doc.text('TRIAGE SCORE', pageWidth - 37.5, yPos + 10, { align: 'center' });

    // --- Summary & Symptoms ---
    yPos += 30;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Clinical Summary', 15, yPos);
    doc.setDrawColor(...primaryColor);
    doc.line(15, yPos + 3, 80, yPos + 3);

    yPos += 15;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Symptoms:', 15, yPos);
    doc.setFont('helvetica', 'normal');
    const symptoms = (patient.symptoms || []).map(s => s.replace(/_/g, ' ')).join(', ');
    const splitSymptoms = doc.splitTextToSize(symptoms || 'None recorded', pageWidth - 40);
    doc.text(splitSymptoms, 40, yPos);
    yPos += (splitSymptoms.length * 5) + 5;

    if (patient.custom_symptoms) {
        doc.setFont('helvetica', 'bold');
        doc.text('Notes:', 15, yPos);
        doc.setFont('helvetica', 'normal');
        const splitNotes = doc.splitTextToSize(patient.custom_symptoms, pageWidth - 40);
        doc.text(splitNotes, 40, yPos);
        yPos += (splitNotes.length * 5) + 10;
    }

    // --- Vitals History Table ---
    yPos += 10;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Vitals Log', 15, yPos);
    doc.setDrawColor(...primaryColor);
    doc.line(15, yPos + 3, 80, yPos + 3);
    yPos += 10;

    const tableData = (history || []).map(entry => [
        new Date(entry.timestamp).toLocaleTimeString(),
        entry.vitals.hr || '-',
        entry.vitals.spo2 || '-',
        entry.vitals.sbp || '-',
        entry.vitals.temp ? `${entry.vitals.temp}°C` : '-',
        entry.vitals.rr ? `${entry.vitals.rr}/min` : '-',
        entry.notes || '-'
    ]);

    // Use autoTable
    autoTable(doc, {
        startY: yPos,
        head: [['Time', 'HR (BPM)', 'SpO2 (%)', 'BP (mmHg)', 'Temp', 'RR', 'Notes']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: primaryColor, textColor: 255 },
        styles: { fontSize: 8 },
        columnStyles: {
            0: { cellWidth: 22 },  // Time
            1: { cellWidth: 18 },  // HR
            2: { cellWidth: 18 },  // SpO2
            3: { cellWidth: 20 },  // BP
            4: { cellWidth: 20 },  // Temp
            5: { cellWidth: 18 },  // RR
            6: { cellWidth: 'auto' }  // Notes
        }
    });

    // Move yPos to end of table
    yPos = doc.lastAutoTable.finalY + 20;

    // --- AI Analysis (if available) ---
    if (alerts && alerts.length > 0) {
        const aiAlert = alerts.find(a => a.payload?.ai_severity || a.payload?.clinical_reasoning);
        if (aiAlert) {
             if (yPos > pageHeight - 50) {
                 doc.addPage();
                 yPos = 20;
             }
             
             doc.setFontSize(14);
             doc.setFont('helvetica', 'bold');
             doc.text('Latest AI Analysis', 15, yPos);
             doc.setDrawColor(...primaryColor);
             doc.line(15, yPos + 3, 80, yPos + 3);
             yPos += 15;
             
             const explanation = aiAlert.payload?.explanation || aiAlert.payload?.clinical_reasoning;
             if (explanation) {
                 const text = typeof explanation === 'string' ? explanation : (explanation.clinical_reasoning || JSON.stringify(explanation));
                 
                 doc.setFontSize(10);
                 doc.setFont('helvetica', 'normal');
                 const splitExp = doc.splitTextToSize(text, pageWidth - 30);
                 doc.text(splitExp, 15, yPos);
             }
        }
    }

    doc.save(`Report_${patient.full_name || 'Patient'}_${new Date().getTime()}.pdf`);
  };

  return (
    <button
      onClick={generatePDF}
      className={`px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider rounded border border-emerald-500/20 transition-all flex items-center justify-center gap-2 ${className || ''}`}
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      Symptom Report
    </button>
  );
};

export default DownloadReportButton;
