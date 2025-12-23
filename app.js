// CGM Portal Application
// All data is processed client-side for privacy

// Global state
let allData = [];
let currentPeriodData = [];
let comparePeriodData = [];
let charts = {};

// Target ranges for weight loss (stricter than diabetes management)
const TARGETS = {
    avgGlucose: { excellent: [79, 85], good: [85, 100], fair: [100, 110], unit: 'mg/dL' },
    cv: { excellent: [0, 25], good: [25, 36], fair: [36, 40], unit: '%' },
    tir: { excellent: [85, 100], good: [70, 85], fair: [50, 70], unit: '%' },
    fasting: { excellent: [70, 85], good: [85, 99], fair: [99, 110], unit: 'mg/dL' }
};

// Toast notification system
function showNotification(message, type = 'info') {
    // Remove existing notification if any
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    // Add styles if not already present
    if (!document.getElementById('toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            .toast-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 8px;
                color: white;
                font-weight: 500;
                z-index: 10000;
                display: flex;
                align-items: center;
                gap: 12px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                animation: slideIn 0.3s ease;
            }
            .toast-info { background: #3b82f6; }
            .toast-success { background: #10b981; }
            .toast-error { background: #ef4444; }
            .toast-close {
                background: none;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
                padding: 0;
                line-height: 1;
            }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    // Auto-remove after delay (longer for errors)
    const delay = type === 'error' ? 5000 : 3000;
    setTimeout(() => toast.remove(), delay);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    setupFileUpload();
    setupModalListeners();
    initDexaLabInputs();
});

// ============================================
// Modal, Tab, and UI Functions
// ============================================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

function setupModalListeners() {
    // Close modal when clicking outside content
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.show').forEach(modal => {
                closeModal(modal.id);
            });
        }
    });
}

function toggleExportHelp() {
    const instructions = document.getElementById('exportInstructions');
    const toggle = document.querySelector('.help-toggle');

    if (instructions && toggle) {
        instructions.classList.toggle('show');
        toggle.classList.toggle('active');
    }
}

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    const tabContent = document.getElementById(tabName + 'Tab');
    if (tabContent) {
        tabContent.classList.add('active');
    }
}

// File Upload Handling
function setupFileUpload() {
    const fileInput = document.getElementById('fileInput');
    const dropZone = document.getElementById('dropZone');

    fileInput.addEventListener('change', handleFileSelect);

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileUpload(file);
        }
    });
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFileUpload(file);
    }
}

// Detect file type and route to appropriate handler
function handleFileUpload(file) {
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.zip')) {
        handleZipFile(file);
    } else if (fileName.endsWith('.csv')) {
        parseCSVFile(file);
    } else {
        alert('Please upload a CSV or ZIP file.');
    }
}

// Handle ZIP file extraction
async function handleZipFile(file) {
    try {
        // Show loading state
        const dropZone = document.getElementById('dropZone');
        const originalContent = dropZone.innerHTML;
        dropZone.innerHTML = '<p>Extracting ZIP file...</p>';

        const zip = await JSZip.loadAsync(file);

        // Look for glucose_readings.csv (required)
        let glucoseFile = zip.file('glucose_readings.csv');

        // If not found at root, search in subdirectories
        if (!glucoseFile) {
            const files = Object.keys(zip.files);
            const glucosePath = files.find(f => f.endsWith('glucose_readings.csv'));
            if (glucosePath) {
                glucoseFile = zip.file(glucosePath);
            }
        }

        if (!glucoseFile) {
            dropZone.innerHTML = originalContent;
            alert('ZIP file must contain glucose_readings.csv');
            return;
        }

        // Extract and parse glucose data
        dropZone.innerHTML = '<p>Processing glucose data...</p>';
        const glucoseContent = await glucoseFile.async('string');

        // Parse glucose CSV content
        Papa.parse(glucoseContent, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: async (results) => {
                if (results.data && results.data.length > 0) {
                    processData(results.data);

                    // Now look for activity_logs.csv (optional - for weight data)
                    let activityFile = zip.file('activity_logs.csv');

                    // If not found at root, search in subdirectories
                    if (!activityFile) {
                        const files = Object.keys(zip.files);
                        const activityPath = files.find(f => f.endsWith('activity_logs.csv'));
                        if (activityPath) {
                            activityFile = zip.file(activityPath);
                        }
                    }

                    if (activityFile) {
                        const activityContent = await activityFile.async('string');
                        parseWeightDataFromContent(activityContent);
                    }
                } else {
                    dropZone.innerHTML = originalContent;
                    alert('No glucose data found in the ZIP file.');
                }
            },
            error: (error) => {
                dropZone.innerHTML = originalContent;
                alert('Error parsing glucose data: ' + error.message);
            }
        });

    } catch (error) {
        alert('Error reading ZIP file: ' + error.message);
    }
}

// Parse weight data from CSV content string (for ZIP extraction)
function parseWeightDataFromContent(csvContent) {
    Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
            // Filter for weight entries and parse
            weightData = results.data
                .filter(row => row.category === 'Weight' && row.notes)
                .map(row => {
                    const weightMatch = row.notes.match(/[\d.]+/);
                    const weight = weightMatch ? parseFloat(weightMatch[0]) : null;
                    return {
                        timestamp: new Date(row.start_at),
                        weight: weight ? parseFloat(weight.toFixed(1)) : null
                    };
                })
                .filter(row => row.weight !== null && !isNaN(row.timestamp.getTime()))
                .sort((a, b) => a.timestamp - b.timestamp);

            if (weightData.length > 0) {
                showWeightSection();
            }
        },
        error: (error) => {
            console.log('Could not parse activity log:', error.message);
        }
    });
}

function parseCSVFile(file) {
    Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
            if (results.data && results.data.length > 0) {
                processData(results.data);
            } else {
                alert('No data found in the CSV file.');
            }
        },
        error: (error) => {
            alert('Error parsing CSV file: ' + error.message);
        }
    });
}

function processData(data) {
    // Parse and validate data
    allData = data
        .filter(row => row.local_timestamp && row.cgm_reading != null)
        .map(row => ({
            timestamp: new Date(row.local_timestamp),
            glucose: parseFloat(row.cgm_reading)
        }))
        .filter(row => !isNaN(row.timestamp.getTime()) && !isNaN(row.glucose))
        .sort((a, b) => a.timestamp - b.timestamp);

    if (allData.length === 0) {
        alert('No valid glucose readings found in the file.');
        return;
    }

    // Initialize with all data
    currentPeriodData = [...allData];
    comparePeriodData = [];

    // Show dashboard
    document.getElementById('uploadSection').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('exportPdfBtn').disabled = false;
    document.getElementById('exportPdfBtn').addEventListener('click', exportToPDF);

    // Setup date inputs
    setupDateInputs();

    // Render everything
    renderDashboard();
}

function setupDateInputs() {
    const minDate = allData[0].timestamp;
    const maxDate = allData[allData.length - 1].timestamp;

    const formatDate = (d) => d.toISOString().split('T')[0];

    document.getElementById('currentStart').min = formatDate(minDate);
    document.getElementById('currentStart').max = formatDate(maxDate);
    document.getElementById('currentEnd').min = formatDate(minDate);
    document.getElementById('currentEnd').max = formatDate(maxDate);
    document.getElementById('compareStart').min = formatDate(minDate);
    document.getElementById('compareStart').max = formatDate(maxDate);
    document.getElementById('compareEnd').min = formatDate(minDate);
    document.getElementById('compareEnd').max = formatDate(maxDate);

    // Set default values
    document.getElementById('currentEnd').value = formatDate(maxDate);
    document.getElementById('currentStart').value = formatDate(new Date(maxDate.getTime() - 14 * 24 * 60 * 60 * 1000));
}

function resetDashboard() {
    document.getElementById('uploadSection').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('fileInput').value = '';
    allData = [];
    currentPeriodData = [];
    comparePeriodData = [];

    // Destroy existing charts
    Object.values(charts).forEach(chart => chart.destroy());
    charts = {};
}

// Period Selection
function selectPeriod(period) {
    // Update button states
    document.querySelectorAll('.btn-group .btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-period="${period}"]`).classList.add('active');

    const maxDate = allData[allData.length - 1].timestamp;
    const minDate = allData[0].timestamp;
    let currentStart, currentEnd, compareStart, compareEnd;

    switch (period) {
        case 'week':
            currentEnd = maxDate;
            currentStart = new Date(maxDate.getTime() - 7 * 24 * 60 * 60 * 1000);
            compareEnd = new Date(currentStart.getTime() - 1);
            compareStart = new Date(compareEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case 'month':
            currentEnd = maxDate;
            currentStart = new Date(maxDate.getTime() - 30 * 24 * 60 * 60 * 1000);
            compareEnd = new Date(currentStart.getTime() - 1);
            compareStart = new Date(compareEnd.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        case 'quarter':
            currentEnd = maxDate;
            currentStart = new Date(maxDate.getTime() - 90 * 24 * 60 * 60 * 1000);
            compareEnd = new Date(currentStart.getTime() - 1);
            compareStart = new Date(compareEnd.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
        case 'all':
        default:
            currentStart = minDate;
            currentEnd = maxDate;
            compareStart = null;
            compareEnd = null;
            break;
    }

    // Update date inputs
    const formatDate = (d) => d ? d.toISOString().split('T')[0] : '';
    document.getElementById('currentStart').value = formatDate(currentStart);
    document.getElementById('currentEnd').value = formatDate(currentEnd);
    document.getElementById('compareStart').value = formatDate(compareStart);
    document.getElementById('compareEnd').value = formatDate(compareEnd);

    applyComparison();
}

function applyComparison() {
    const currentStart = new Date(document.getElementById('currentStart').value);
    const currentEnd = new Date(document.getElementById('currentEnd').value);
    currentEnd.setHours(23, 59, 59, 999);

    const compareStartVal = document.getElementById('compareStart').value;
    const compareEndVal = document.getElementById('compareEnd').value;

    currentPeriodData = allData.filter(d => d.timestamp >= currentStart && d.timestamp <= currentEnd);

    if (compareStartVal && compareEndVal) {
        const compareStart = new Date(compareStartVal);
        const compareEnd = new Date(compareEndVal);
        compareEnd.setHours(23, 59, 59, 999);
        comparePeriodData = allData.filter(d => d.timestamp >= compareStart && d.timestamp <= compareEnd);
    } else {
        comparePeriodData = [];
    }

    renderDashboard();

    // Update health insights if weight section is visible
    if (weightData.length > 0) {
        updateHealthInsightsPeriod();
    }
}

// Update health insights period indicator and recalculate if >= 14 days
function updateHealthInsightsPeriod() {
    const periodValueEl = document.getElementById('insightsPeriodValue');
    const periodNoteEl = document.getElementById('periodNote');

    if (!periodValueEl) return;

    // Calculate days in current period
    const periodDays = Math.ceil((currentPeriodData.length > 0 ?
        (currentPeriodData[currentPeriodData.length - 1].timestamp - currentPeriodData[0].timestamp) / (24 * 60 * 60 * 1000) : 0)) + 1;

    // Get the active period button text
    const activeBtn = document.querySelector('.btn-group .btn.active');
    let periodLabel = activeBtn ? activeBtn.textContent : 'All Data';

    // If custom dates, show the date range
    if (periodLabel === 'All Data' && currentPeriodData.length !== allData.length) {
        const start = currentPeriodData[0]?.timestamp;
        const end = currentPeriodData[currentPeriodData.length - 1]?.timestamp;
        if (start && end) {
            periodLabel = `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
        }
    }

    periodValueEl.textContent = periodLabel;

    // Update note based on days
    if (periodDays < 14) {
        periodNoteEl.textContent = `(${periodDays} days - need 14+ for reliable GMI)`;
        periodNoteEl.className = 'period-note period-warning';
    } else {
        periodNoteEl.textContent = `(${periodDays} days of data)`;
        periodNoteEl.className = 'period-note';
    }

    // Recalculate insights with current period data (if >= 14 days, use period; else use all data)
    const dataToUse = periodDays >= 14 ? currentPeriodData : allData;
    calculateGMI(dataToUse);
    calculateCVInsight(dataToUse);
    calculateFastingGlucoseInsight(dataToUse);
}

// Render Dashboard
function renderDashboard() {
    renderPatientInfo();
    renderMetrics();
    renderTIRChart();
    renderAGPChart();
    renderDailyChart();
    renderProgressChart();
    renderSummaryTable();
}

function renderPatientInfo() {
    const minDate = allData[0].timestamp;
    const maxDate = allData[allData.length - 1].timestamp;
    const totalDays = Math.ceil((maxDate - minDate) / (24 * 60 * 60 * 1000)) + 1;

    // Calculate data coverage
    const expectedReadings = totalDays * 288; // 288 readings per day (every 5 min)
    const coverage = Math.min(100, (allData.length / expectedReadings) * 100);

    document.getElementById('dateRange').textContent =
        `${minDate.toLocaleDateString()} - ${maxDate.toLocaleDateString()}`;
    document.getElementById('totalDays').textContent = totalDays;
    document.getElementById('dataCoverage').textContent = `${coverage.toFixed(0)}%`;
    document.getElementById('totalReadings').textContent = allData.length.toLocaleString();
}

// Metric Calculations
function calculateMetrics(data) {
    if (data.length === 0) return null;

    const glucoseValues = data.map(d => d.glucose);
    const avgGlucose = glucoseValues.reduce((a, b) => a + b, 0) / glucoseValues.length;

    // Standard deviation and CV
    const squaredDiffs = glucoseValues.map(v => Math.pow(v - avgGlucose, 2));
    const stdDev = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / glucoseValues.length);
    const cv = (stdDev / avgGlucose) * 100;

    // Time in ranges (for weight loss targets)
    const tirLow = glucoseValues.filter(v => v < 70).length / glucoseValues.length * 100;
    const tirOptimal = glucoseValues.filter(v => v >= 70 && v <= 110).length / glucoseValues.length * 100;
    const tirElevated = glucoseValues.filter(v => v > 110 && v <= 140).length / glucoseValues.length * 100;
    const tirHigh = glucoseValues.filter(v => v > 140).length / glucoseValues.length * 100;

    // Fasting glucose (readings between 4am and 7am)
    const fastingReadings = data.filter(d => {
        const hour = d.timestamp.getHours();
        return hour >= 4 && hour < 7;
    });
    const fastingGlucose = fastingReadings.length > 0
        ? fastingReadings.map(d => d.glucose).reduce((a, b) => a + b, 0) / fastingReadings.length
        : null;

    return {
        avgGlucose: avgGlucose,
        cv: cv,
        stdDev: stdDev,
        tir: tirOptimal,
        tirLow: tirLow,
        tirOptimal: tirOptimal,
        tirElevated: tirElevated,
        tirHigh: tirHigh,
        fasting: fastingGlucose,
        min: Math.min(...glucoseValues),
        max: Math.max(...glucoseValues),
        count: glucoseValues.length
    };
}

function getStatus(metricName, value) {
    if (value === null) return { status: 'unknown', label: 'N/A' };

    const targets = TARGETS[metricName];
    if (!targets) return { status: 'unknown', label: 'N/A' };

    // For CV and avgGlucose/fasting, lower is better
    // For TIR, higher is better
    const isHigherBetter = metricName === 'tir';

    if (isHigherBetter) {
        if (value >= targets.excellent[0]) return { status: 'excellent', label: 'Excellent' };
        if (value >= targets.good[0]) return { status: 'good', label: 'Good' };
        if (value >= targets.fair[0]) return { status: 'fair', label: 'Fair' };
        return { status: 'poor', label: 'Needs Improvement' };
    } else {
        if (value >= targets.excellent[0] && value <= targets.excellent[1]) return { status: 'excellent', label: 'Excellent' };
        if (value >= targets.good[0] && value <= targets.good[1]) return { status: 'good', label: 'Good' };
        if (value >= targets.fair[0] && value <= targets.fair[1]) return { status: 'fair', label: 'Fair' };
        return { status: 'poor', label: 'Needs Improvement' };
    }
}

function renderMetrics() {
    const currentMetrics = calculateMetrics(currentPeriodData);
    const compareMetrics = comparePeriodData.length > 0 ? calculateMetrics(comparePeriodData) : null;

    // Render each metric card
    renderMetricCard('avgGlucose', currentMetrics?.avgGlucose, compareMetrics?.avgGlucose, 1, false);
    renderMetricCard('variability', currentMetrics?.cv, compareMetrics?.cv, 1, false, 'cv');
    renderMetricCard('tir', currentMetrics?.tir, compareMetrics?.tir, 1, true);
    renderMetricCard('fasting', currentMetrics?.fasting, compareMetrics?.fasting, 1, false);

    // Update TIR legend values
    document.getElementById('tirHigh').textContent = `${currentMetrics?.tirHigh?.toFixed(1) || 0}%`;
    document.getElementById('tirElevated').textContent = `${currentMetrics?.tirElevated?.toFixed(1) || 0}%`;
    document.getElementById('tirOptimal').textContent = `${currentMetrics?.tirOptimal?.toFixed(1) || 0}%`;
    document.getElementById('tirLow').textContent = `${currentMetrics?.tirLow?.toFixed(1) || 0}%`;
}

function renderMetricCard(id, currentValue, compareValue, decimals = 1, higherIsBetter = false, statusKey = null) {
    const valueEl = document.getElementById(id);
    const statusEl = document.getElementById(id + 'Status');
    const changeEl = document.getElementById(id + 'Change');
    const compareEl = document.getElementById(id + 'Compare');
    const cardEl = document.getElementById(id + 'Card');

    if (currentValue === null || currentValue === undefined) {
        valueEl.textContent = '-';
        statusEl.textContent = '';
        statusEl.className = 'metric-status';
        changeEl.textContent = '';
        changeEl.className = 'metric-change';
        compareEl.textContent = '';
        cardEl.className = 'metric-card';
        return;
    }

    valueEl.textContent = currentValue.toFixed(decimals);

    const status = getStatus(statusKey || id, currentValue);
    statusEl.textContent = status.label;
    statusEl.className = `metric-status ${status.status}`;
    cardEl.className = `metric-card status-${status.status}`;

    // Change calculation
    if (compareValue !== null && compareValue !== undefined) {
        const change = ((currentValue - compareValue) / compareValue) * 100;
        const improved = higherIsBetter ? change > 0 : change < 0;

        changeEl.textContent = `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
        changeEl.className = `metric-change ${improved ? 'positive' : 'negative'}`;

        compareEl.textContent = `Previous: ${compareValue.toFixed(decimals)}`;
    } else {
        changeEl.textContent = '';
        changeEl.className = 'metric-change';
        compareEl.textContent = '';
    }
}

// Charts
function renderTIRChart() {
    const metrics = calculateMetrics(currentPeriodData);
    if (!metrics) return;

    const ctx = document.getElementById('tirChart').getContext('2d');

    if (charts.tir) {
        charts.tir.destroy();
    }

    charts.tir = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Low (<70)', 'Optimal (70-110)', 'Elevated (110-140)', 'High (>140)'],
            datasets: [{
                data: [metrics.tirLow, metrics.tirOptimal, metrics.tirElevated, metrics.tirHigh],
                backgroundColor: ['#ef4444', '#10b981', '#f59e0b', '#dc2626'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.label}: ${context.raw.toFixed(1)}%`
                    }
                }
            }
        }
    });

    // Render comparison bars if comparing
    renderTIRComparison();
}

function renderTIRComparison() {
    const container = document.getElementById('tirComparisonBars');

    if (comparePeriodData.length === 0) {
        container.innerHTML = '';
        return;
    }

    const currentMetrics = calculateMetrics(currentPeriodData);
    const compareMetrics = calculateMetrics(comparePeriodData);

    container.innerHTML = `
        <h4 style="margin: 0 0 16px 0; font-size: 0.9rem; color: var(--text-secondary);">Period Comparison</h4>
        <div style="display: flex; gap: 24px;">
            <div style="flex: 1;">
                <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px;">Current Period</div>
                <div style="display: flex; height: 24px; border-radius: 4px; overflow: hidden;">
                    <div style="width: ${currentMetrics.tirLow}%; background: #ef4444;" title="Low: ${currentMetrics.tirLow.toFixed(1)}%"></div>
                    <div style="width: ${currentMetrics.tirOptimal}%; background: #10b981;" title="Optimal: ${currentMetrics.tirOptimal.toFixed(1)}%"></div>
                    <div style="width: ${currentMetrics.tirElevated}%; background: #f59e0b;" title="Elevated: ${currentMetrics.tirElevated.toFixed(1)}%"></div>
                    <div style="width: ${currentMetrics.tirHigh}%; background: #dc2626;" title="High: ${currentMetrics.tirHigh.toFixed(1)}%"></div>
                </div>
            </div>
            <div style="flex: 1;">
                <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px;">Previous Period</div>
                <div style="display: flex; height: 24px; border-radius: 4px; overflow: hidden;">
                    <div style="width: ${compareMetrics.tirLow}%; background: #ef4444;" title="Low: ${compareMetrics.tirLow.toFixed(1)}%"></div>
                    <div style="width: ${compareMetrics.tirOptimal}%; background: #10b981;" title="Optimal: ${compareMetrics.tirOptimal.toFixed(1)}%"></div>
                    <div style="width: ${compareMetrics.tirElevated}%; background: #f59e0b;" title="Elevated: ${compareMetrics.tirElevated.toFixed(1)}%"></div>
                    <div style="width: ${compareMetrics.tirHigh}%; background: #dc2626;" title="High: ${compareMetrics.tirHigh.toFixed(1)}%"></div>
                </div>
            </div>
        </div>
    `;
}

function renderAGPChart() {
    const ctx = document.getElementById('agpChart').getContext('2d');

    if (charts.agp) {
        charts.agp.destroy();
    }

    // Group data by time of day (in 15-minute intervals)
    const timeGroups = {};
    for (let i = 0; i < 96; i++) { // 96 intervals of 15 minutes in a day
        timeGroups[i] = [];
    }

    currentPeriodData.forEach(d => {
        const minutes = d.timestamp.getHours() * 60 + d.timestamp.getMinutes();
        const interval = Math.floor(minutes / 15);
        timeGroups[interval].push(d.glucose);
    });

    // Calculate percentiles for each interval
    const labels = [];
    const medians = [];
    const p25 = [];
    const p75 = [];
    const p10 = [];
    const p90 = [];

    for (let i = 0; i < 96; i++) {
        const hour = Math.floor(i * 15 / 60);
        const minute = (i * 15) % 60;
        labels.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);

        const values = timeGroups[i].sort((a, b) => a - b);
        if (values.length > 0) {
            medians.push(percentile(values, 50));
            p25.push(percentile(values, 25));
            p75.push(percentile(values, 75));
            p10.push(percentile(values, 10));
            p90.push(percentile(values, 90));
        } else {
            medians.push(null);
            p25.push(null);
            p75.push(null);
            p10.push(null);
            p90.push(null);
        }
    }

    charts.agp = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '90th percentile',
                    data: p90,
                    borderColor: 'transparent',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    fill: '+1',
                    pointRadius: 0,
                    tension: 0.4
                },
                {
                    label: '10th percentile',
                    data: p10,
                    borderColor: 'transparent',
                    backgroundColor: 'transparent',
                    fill: false,
                    pointRadius: 0,
                    tension: 0.4
                },
                {
                    label: '75th percentile',
                    data: p75,
                    borderColor: 'transparent',
                    backgroundColor: 'rgba(37, 99, 235, 0.25)',
                    fill: '+1',
                    pointRadius: 0,
                    tension: 0.4
                },
                {
                    label: '25th percentile',
                    data: p25,
                    borderColor: 'transparent',
                    backgroundColor: 'transparent',
                    fill: false,
                    pointRadius: 0,
                    tension: 0.4
                },
                {
                    label: 'Median',
                    data: medians,
                    borderColor: '#2563eb',
                    backgroundColor: 'transparent',
                    borderWidth: 3,
                    fill: false,
                    pointRadius: 0,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        title: (context) => `Time: ${context[0].label}`,
                        label: (context) => {
                            if (context.datasetIndex === 4) {
                                return `Median: ${context.raw?.toFixed(0) || '-'} mg/dL`;
                            }
                            return null;
                        }
                    },
                    filter: (item) => item.datasetIndex === 4
                },
                annotation: {
                    annotations: {
                        optimalLow: {
                            type: 'line',
                            yMin: 70,
                            yMax: 70,
                            borderColor: 'rgba(16, 185, 129, 0.5)',
                            borderWidth: 1,
                            borderDash: [5, 5]
                        },
                        optimalHigh: {
                            type: 'line',
                            yMin: 110,
                            yMax: 110,
                            borderColor: 'rgba(245, 158, 11, 0.5)',
                            borderWidth: 1,
                            borderDash: [5, 5]
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        callback: function(value, index) {
                            // Show every 2 hours
                            if (index % 8 === 0) {
                                const hour = Math.floor(index * 15 / 60);
                                return `${hour}:00`;
                            }
                            return '';
                        },
                        maxRotation: 0
                    }
                },
                y: {
                    min: 40,
                    max: 200,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        callback: (value) => `${value}`
                    }
                }
            }
        }
    });

    // Add target range bands manually via plugin
    addRangeBands(charts.agp);
}

function addRangeBands(chart) {
    // This adds colored background bands for target ranges
    const originalDraw = chart.draw;
    chart.draw = function() {
        const ctx = this.ctx;
        const chartArea = this.chartArea;
        const yScale = this.scales.y;

        // Draw optimal range (70-110) - green
        const optimalTop = yScale.getPixelForValue(110);
        const optimalBottom = yScale.getPixelForValue(70);
        ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
        ctx.fillRect(chartArea.left, optimalTop, chartArea.right - chartArea.left, optimalBottom - optimalTop);

        // Draw elevated range (110-140) - yellow
        const elevatedTop = yScale.getPixelForValue(140);
        ctx.fillStyle = 'rgba(245, 158, 11, 0.1)';
        ctx.fillRect(chartArea.left, elevatedTop, chartArea.right - chartArea.left, optimalTop - elevatedTop);

        originalDraw.apply(this, arguments);
    };
    chart.draw();
}

function renderDailyChart() {
    const ctx = document.getElementById('dailyChart').getContext('2d');

    if (charts.daily) {
        charts.daily.destroy();
    }

    // Get last 14 days of data
    const endDate = currentPeriodData[currentPeriodData.length - 1]?.timestamp || new Date();
    const startDate = new Date(endDate.getTime() - 14 * 24 * 60 * 60 * 1000);

    const recentData = currentPeriodData.filter(d => d.timestamp >= startDate);

    // Group by day
    const dailyData = {};
    recentData.forEach(d => {
        const dateKey = d.timestamp.toISOString().split('T')[0];
        if (!dailyData[dateKey]) {
            dailyData[dateKey] = [];
        }
        dailyData[dateKey].push(d.glucose);
    });

    const labels = Object.keys(dailyData).sort();
    const avgValues = labels.map(date => {
        const values = dailyData[date];
        return values.reduce((a, b) => a + b, 0) / values.length;
    });
    const minValues = labels.map(date => Math.min(...dailyData[date]));
    const maxValues = labels.map(date => Math.max(...dailyData[date]));

    charts.daily = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
            datasets: [
                {
                    label: 'Max',
                    data: maxValues,
                    borderColor: 'rgba(245, 158, 11, 0.5)',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    fill: '+1',
                    pointRadius: 0,
                    tension: 0.4
                },
                {
                    label: 'Average',
                    data: avgValues,
                    borderColor: '#2563eb',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    pointRadius: 3,
                    pointBackgroundColor: '#2563eb',
                    tension: 0.4
                },
                {
                    label: 'Min',
                    data: minValues,
                    borderColor: 'rgba(16, 185, 129, 0.5)',
                    backgroundColor: 'transparent',
                    fill: false,
                    pointRadius: 0,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.dataset.label}: ${context.raw.toFixed(0)} mg/dL`
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    min: 40,
                    max: 200,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                }
            }
        }
    });
}

function renderProgressChart() {
    const metric = document.getElementById('progressMetric').value;
    const ctx = document.getElementById('progressChart').getContext('2d');

    if (charts.progress) {
        charts.progress.destroy();
    }

    // Calculate weekly metrics for entire data range
    const weeklyData = calculateWeeklyMetrics();

    const labels = weeklyData.map(w => w.label);
    let values, label, color;

    switch (metric) {
        case 'avgGlucose':
            values = weeklyData.map(w => w.avgGlucose);
            label = 'Average Glucose (mg/dL)';
            color = '#2563eb';
            break;
        case 'cv':
            values = weeklyData.map(w => w.cv);
            label = 'Glucose Variability (CV%)';
            color = '#8b5cf6';
            break;
        case 'tir':
            values = weeklyData.map(w => w.tir);
            label = 'Time in Optimal Range (%)';
            color = '#10b981';
            break;
        case 'fasting':
            values = weeklyData.map(w => w.fasting);
            label = 'Fasting Glucose (mg/dL)';
            color = '#f59e0b';
            break;
    }

    // Calculate trendline
    const trendline = calculateTrendline(values);

    charts.progress = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: label,
                    data: values,
                    borderColor: color,
                    backgroundColor: color + '20',
                    borderWidth: 2,
                    pointRadius: 4,
                    pointBackgroundColor: color,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Trend',
                    data: trendline,
                    borderColor: '#94a3b8',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            if (context.datasetIndex === 0) {
                                return `${label}: ${context.raw?.toFixed(1) || '-'}`;
                            }
                            return null;
                        }
                    },
                    filter: (item) => item.datasetIndex === 0
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                }
            }
        }
    });
}

function updateProgressChart() {
    renderProgressChart();
}

function calculateWeeklyMetrics() {
    const weeks = [];
    const minDate = allData[0].timestamp;
    const maxDate = allData[allData.length - 1].timestamp;

    let currentWeekStart = new Date(minDate);
    currentWeekStart.setHours(0, 0, 0, 0);
    // Align to Monday
    const dayOfWeek = currentWeekStart.getDay();
    currentWeekStart.setDate(currentWeekStart.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    while (currentWeekStart <= maxDate) {
        const weekEnd = new Date(currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
        const weekData = allData.filter(d => d.timestamp >= currentWeekStart && d.timestamp <= weekEnd);

        if (weekData.length > 0) {
            const metrics = calculateMetrics(weekData);
            weeks.push({
                label: currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                startDate: new Date(currentWeekStart),
                ...metrics
            });
        }

        currentWeekStart = new Date(currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    return weeks;
}

function calculateTrendline(values) {
    const n = values.length;
    if (n < 2) return values;

    // Filter out null values for calculation
    const validIndices = values.map((v, i) => v !== null ? i : null).filter(i => i !== null);
    const validValues = validIndices.map(i => values[i]);

    if (validValues.length < 2) return values;

    // Simple linear regression
    const sumX = validIndices.reduce((a, b) => a + b, 0);
    const sumY = validValues.reduce((a, b) => a + b, 0);
    const sumXY = validIndices.reduce((sum, x, i) => sum + x * validValues[i], 0);
    const sumXX = validIndices.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return values.map((_, i) => slope * i + intercept);
}

function renderSummaryTable() {
    const tbody = document.getElementById('summaryTableBody');

    // Calculate metrics for different periods
    const allMetrics = calculateMetrics(allData);
    const currentMetrics = calculateMetrics(currentPeriodData);

    // First week data
    const firstWeekEnd = new Date(allData[0].timestamp.getTime() + 7 * 24 * 60 * 60 * 1000);
    const firstWeekData = allData.filter(d => d.timestamp <= firstWeekEnd);
    const firstWeekMetrics = calculateMetrics(firstWeekData);

    // Previous period (if comparing)
    const prevMetrics = comparePeriodData.length > 0 ? calculateMetrics(comparePeriodData) : null;

    const metrics = [
        { name: 'Average Glucose', key: 'avgGlucose', unit: 'mg/dL', decimals: 1, lowerBetter: true },
        { name: 'Glucose Variability (CV)', key: 'cv', unit: '%', decimals: 1, lowerBetter: true },
        { name: 'Time in Optimal Range', key: 'tir', unit: '%', decimals: 1, lowerBetter: false },
        { name: 'Fasting Glucose', key: 'fasting', unit: 'mg/dL', decimals: 1, lowerBetter: true }
    ];

    tbody.innerHTML = metrics.map(m => {
        const firstVal = firstWeekMetrics?.[m.key];
        const prevVal = prevMetrics?.[m.key];
        const currVal = currentMetrics?.[m.key];

        let changeText = '-';
        let changeClass = '';

        if (firstVal && currVal) {
            const change = ((currVal - firstVal) / firstVal) * 100;
            const improved = m.lowerBetter ? change < 0 : change > 0;
            changeText = `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
            changeClass = improved ? 'change-positive' : 'change-negative';
            changeText = `${improved ? '↓' : '↑'} ${Math.abs(change).toFixed(1)}%`;
        }

        return `
            <tr>
                <td><strong>${m.name}</strong></td>
                <td>${firstVal !== null && firstVal !== undefined ? firstVal.toFixed(m.decimals) + ' ' + m.unit : '-'}</td>
                <td>${prevVal !== null && prevVal !== undefined ? prevVal.toFixed(m.decimals) + ' ' + m.unit : '-'}</td>
                <td>${currVal !== null && currVal !== undefined ? currVal.toFixed(m.decimals) + ' ' + m.unit : '-'}</td>
                <td class="${changeClass}">${changeText}</td>
            </tr>
        `;
    }).join('');
}

// Utility Functions
function percentile(arr, p) {
    if (arr.length === 0) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

// PDF Export
function exportToPDF() {
    const element = document.getElementById('dashboard');
    const opt = {
        margin: 10,
        filename: `CGM_Report_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Temporarily hide certain elements
    const hideElements = document.querySelectorAll('.btn, .comparison-selector');
    hideElements.forEach(el => el.style.display = 'none');

    html2pdf().set(opt).from(element).save().then(() => {
        hideElements.forEach(el => el.style.display = '');
    });
}

// ============================================
// WEIGHT TRACKING & HEALTH INSIGHTS
// ============================================

// Weight data storage
let weightData = [];

// Setup weight file upload on page load
document.addEventListener('DOMContentLoaded', () => {
    const weightInput = document.getElementById('weightInput');
    if (weightInput) {
        weightInput.addEventListener('change', handleWeightFileSelect);
    }
});

function handleWeightFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                // Filter for weight entries and parse
                weightData = results.data
                    .filter(row => row.category === 'Weight' && row.notes)
                    .map(row => {
                        const weightMatch = row.notes.match(/[\d.]+/);
                        const weight = weightMatch ? parseFloat(weightMatch[0]) : null;
                        return {
                            timestamp: new Date(row.start_at),
                            weight: weight ? parseFloat(weight.toFixed(1)) : null
                        };
                    })
                    .filter(row => row.weight !== null && !isNaN(row.timestamp.getTime()))
                    .sort((a, b) => a.timestamp - b.timestamp);

                if (weightData.length > 0) {
                    showWeightSection();
                } else {
                    alert('No weight data found in the activity log.');
                }
            },
            error: (error) => {
                alert('Error parsing activity log: ' + error.message);
            }
        });
    }
}

function showWeightSection() {
    document.getElementById('weightUploadPrompt').classList.add('hidden');
    document.getElementById('weightSection').classList.remove('hidden');
    renderWeightMetrics();
    renderWeightChart();
    renderHealthInsights();
    renderMilestones();
}

function renderWeightMetrics() {
    if (weightData.length === 0) return;

    const startWeight = weightData[0].weight;
    const currentWeight = weightData[weightData.length - 1].weight;
    const totalChange = currentWeight - startWeight;
    const changePercent = (totalChange / startWeight) * 100;

    // Calculate weekly rate
    const daysDiff = (weightData[weightData.length - 1].timestamp - weightData[0].timestamp) / (1000 * 60 * 60 * 24);
    const weeklyRate = daysDiff > 0 ? (totalChange / daysDiff) * 7 : 0;

    // Update metric cards
    document.getElementById('currentWeight').textContent = currentWeight.toFixed(1);
    document.getElementById('currentWeightDate').textContent = weightData[weightData.length - 1].timestamp.toLocaleDateString();

    document.getElementById('startingWeight').textContent = startWeight.toFixed(1);
    document.getElementById('startingWeightDate').textContent = weightData[0].timestamp.toLocaleDateString();

    document.getElementById('totalChange').textContent = (totalChange >= 0 ? '+' : '') + totalChange.toFixed(1);
    document.getElementById('totalChangePercent').textContent = (changePercent >= 0 ? '+' : '') + changePercent.toFixed(1) + '%';
    document.getElementById('totalChangePercent').className = 'weight-metric-change ' + (totalChange <= 0 ? 'positive' : 'negative');

    document.getElementById('weeklyRate').textContent = (weeklyRate >= 0 ? '+' : '') + weeklyRate.toFixed(2);
    const rateStatus = weeklyRate <= 0 ? (weeklyRate >= -2 ? 'Healthy pace' : 'Rapid loss') : 'Gaining';
    document.getElementById('weeklyRateStatus').textContent = rateStatus;
    document.getElementById('weeklyRateStatus').className = 'weight-metric-change ' + (weeklyRate <= 0 ? 'positive' : 'negative');

    // Update card states
    document.getElementById('totalChangeCard').className = 'weight-metric-card ' + (totalChange <= 0 ? 'positive' : 'warning');
    document.getElementById('weeklyRateCard').className = 'weight-metric-card ' + (weeklyRate <= 0 ? 'positive' : 'warning');
}

function renderWeightChart() {
    if (weightData.length === 0) return;

    const ctx = document.getElementById('weightChart').getContext('2d');

    if (charts.weight) {
        charts.weight.destroy();
    }

    // Prepare weight data points
    const weightPoints = weightData.map(d => ({
        x: d.timestamp,
        y: d.weight
    }));

    // Calculate weight trendline
    const weightTrendline = calculateLinearTrendline(weightPoints);

    // Calculate weekly glucose averages
    const weeklyGlucose = calculateWeeklyGlucoseAverages();

    // Calculate glucose trendline
    const glucoseTrendline = weeklyGlucose.length >= 2 ? calculateLinearTrendline(weeklyGlucose) : [];

    const datasets = [
        // Weight line (left axis)
        {
            label: 'Weight (lbs)',
            data: weightPoints,
            borderColor: '#059669',
            backgroundColor: 'rgba(5, 150, 105, 0.08)',
            borderWidth: 2.5,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#059669',
            fill: true,
            tension: 0.4,
            yAxisID: 'y'
        },
        // Weight trendline
        {
            label: 'Weight Trend',
            data: weightTrendline,
            borderColor: '#059669',
            borderWidth: 2,
            borderDash: [8, 4],
            pointRadius: 0,
            fill: false,
            tension: 0,
            yAxisID: 'y'
        }
    ];

    // Add glucose data if available
    if (weeklyGlucose.length > 0) {
        datasets.push({
            label: 'Avg Glucose (mg/dL)',
            data: weeklyGlucose,
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.08)',
            borderWidth: 2.5,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#2563eb',
            fill: true,
            tension: 0.4,
            yAxisID: 'y1'
        });

        if (glucoseTrendline.length > 0) {
            datasets.push({
                label: 'Glucose Trend',
                data: glucoseTrendline,
                borderColor: '#2563eb',
                borderWidth: 2,
                borderDash: [8, 4],
                pointRadius: 0,
                fill: false,
                tension: 0,
                yAxisID: 'y1'
            });
        }
    }

    charts.weight = new Chart(ctx, {
        type: 'line',
        data: { datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: (items) => {
                            if (items.length > 0) {
                                return new Date(items[0].parsed.x).toLocaleDateString();
                            }
                            return '';
                        },
                        label: (context) => {
                            if (context.dataset.label.includes('Trend')) return null;
                            const label = context.dataset.label;
                            const value = context.parsed.y;
                            if (label.includes('Weight')) {
                                return `Weight: ${value.toFixed(1)} lbs`;
                            } else if (label.includes('Glucose')) {
                                return `Avg Glucose: ${value.toFixed(0)} mg/dL`;
                            }
                            return `${label}: ${value}`;
                        }
                    },
                    filter: (item) => !item.dataset.label.includes('Trend')
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'week',
                        displayFormats: { week: 'MMM d' }
                    },
                    grid: { display: false },
                    ticks: { maxRotation: 0 }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Weight (lbs)',
                        color: '#059669'
                    },
                    ticks: { color: '#059669' },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                y1: {
                    type: 'linear',
                    display: weeklyGlucose.length > 0,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Avg Glucose (mg/dL)',
                        color: '#2563eb'
                    },
                    ticks: { color: '#2563eb' },
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });

    // Generate chart insight
    generateChartInsight(weightPoints, weeklyGlucose, weightTrendline, glucoseTrendline);
}

function calculateWeeklyGlucoseAverages() {
    if (allData.length === 0) return [];

    const weeklyData = {};
    allData.forEach(d => {
        const date = new Date(d.timestamp);
        const day = date.getDay();
        const monday = new Date(date);
        monday.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
        monday.setHours(0, 0, 0, 0);
        const weekKey = monday.toISOString().split('T')[0];

        if (!weeklyData[weekKey]) weeklyData[weekKey] = [];
        weeklyData[weekKey].push(d.glucose);
    });

    return Object.entries(weeklyData)
        .map(([weekStart, values]) => ({
            x: new Date(weekStart),
            y: values.reduce((a, b) => a + b, 0) / values.length
        }))
        .sort((a, b) => a.x - b.x);
}

function calculateLinearTrendline(dataPoints) {
    if (dataPoints.length < 2) return [];

    const n = dataPoints.length;
    const xValues = dataPoints.map(d => d.x.getTime());
    const yValues = dataPoints.map(d => d.y);

    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return [
        { x: dataPoints[0].x, y: slope * xValues[0] + intercept },
        { x: dataPoints[n - 1].x, y: slope * xValues[n - 1] + intercept }
    ];
}

function generateChartInsight(weightPoints, glucosePoints, weightTrend, glucoseTrend) {
    const insightEl = document.getElementById('chartInsight');
    if (!insightEl) return;

    if (weightPoints.length < 2) {
        insightEl.innerHTML = '';
        return;
    }

    const weightChange = weightTrend[1].y - weightTrend[0].y;
    const weightTrending = weightChange < -1 ? 'decreasing' : (weightChange > 1 ? 'increasing' : 'stable');

    let insight = '';
    let isPositive = weightTrending === 'decreasing';

    if (glucoseTrend.length >= 2) {
        const glucoseChange = glucoseTrend[1].y - glucoseTrend[0].y;
        const glucoseTrending = glucoseChange < -2 ? 'improving' : (glucoseChange > 2 ? 'rising' : 'stable');

        if (weightTrending === 'decreasing' && glucoseTrending === 'improving') {
            insight = `<h4>🎯 Positive Correlation Detected</h4>
                <p>Your weight is trending down while your average glucose is improving. This suggests your metabolic health is responding positively to your weight loss efforts. Keep up the great work!</p>`;
            isPositive = true;
        } else if (weightTrending === 'decreasing' && glucoseTrending === 'stable') {
            insight = `<h4>📊 Weight Decreasing, Glucose Stable</h4>
                <p>Your weight is trending downward while glucose remains stable. As you continue losing weight, you may see further improvements in glucose control.</p>`;
            isPositive = true;
        } else if (weightTrending === 'stable') {
            insight = `<h4>📈 Weight Stable</h4>
                <p>Your weight has been relatively stable during this period. Consider reviewing your nutrition and activity patterns to reinvigorate your weight loss progress.</p>`;
            isPositive = false;
        } else {
            insight = `<h4>📊 Tracking Your Progress</h4>
                <p>Continue monitoring both weight and glucose trends. Consistent tracking helps identify patterns and opportunities for improvement.</p>`;
        }
    } else {
        if (weightTrending === 'decreasing') {
            insight = `<h4>✓ Weight Trending Down</h4>
                <p>Your weight shows a downward trend. Add more CGM data to see how glucose correlates with your weight loss.</p>`;
            isPositive = true;
        } else {
            insight = `<h4>📊 Tracking Started</h4>
                <p>Continue tracking to build enough data for meaningful trend analysis.</p>`;
        }
    }

    insightEl.innerHTML = insight;
    insightEl.className = 'chart-insight' + (isPositive ? '' : ' negative');
}

// ============================================
// HEALTH INSIGHTS CALCULATIONS
// ============================================

function renderHealthInsights() {
    // Initial render uses all data
    calculateGMI(allData);
    calculateCVInsight(allData);
    calculateFastingGlucoseInsight(allData);
    calculateRiskReduction();
    analyzePatterns();

    // Initialize period indicator
    updateHealthInsightsPeriod();
}

// GMI (Glucose Management Indicator) - Estimated A1C
// Formula: GMI (%) = 3.31 + 0.02392 × (mean glucose in mg/dL)
function calculateGMI(data) {
    data = data || allData;
    if (data.length === 0) return;

    const meanGlucose = data.reduce((sum, d) => sum + d.glucose, 0) / data.length;
    const gmi = 3.31 + (0.02392 * meanGlucose);

    document.getElementById('gmiValue').textContent = gmi.toFixed(1);
    document.getElementById('gmiInfo').textContent = `Based on avg glucose: ${meanGlucose.toFixed(0)} mg/dL`;

    let status, statusClass;
    if (gmi < 5.7) {
        status = 'Normal';
        statusClass = 'normal';
    } else if (gmi < 6.5) {
        status = 'Prediabetes Range';
        statusClass = 'warning';
    } else {
        status = 'Diabetes Range';
        statusClass = 'danger';
    }

    const statusEl = document.getElementById('gmiStatus');
    statusEl.textContent = status;
    statusEl.className = 'insight-status ' + statusClass;
}

// CV% for Health Insights (different element IDs)
function calculateCVInsight(data) {
    data = data || allData;
    if (data.length === 0) return;

    const values = data.map(d => d.glucose);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const cv = (stdDev / mean) * 100;

    document.getElementById('cvValueInsight').textContent = cv.toFixed(1);

    let status, statusClass;
    if (cv <= 18) {
        status = 'Excellent (healthy range)';
        statusClass = 'normal';
    } else if (cv <= 36) {
        status = 'Stable';
        statusClass = 'normal';
    } else {
        status = 'High Variability';
        statusClass = 'warning';
    }

    const statusEl = document.getElementById('cvStatusInsight');
    statusEl.textContent = status;
    statusEl.className = 'insight-status ' + statusClass;
}

// Fasting Glucose for Health Insights
function calculateFastingGlucoseInsight(data) {
    data = data || allData;
    if (data.length === 0) return;

    const fastingReadings = data.filter(d => {
        const hour = d.timestamp.getHours();
        return hour >= 4 && hour <= 7;
    });

    if (fastingReadings.length === 0) {
        document.getElementById('fastingValueInsight').textContent = 'N/A';
        document.getElementById('fastingStatusInsight').textContent = 'No early morning data';
        return;
    }

    const avgFasting = fastingReadings.reduce((sum, d) => sum + d.glucose, 0) / fastingReadings.length;

    document.getElementById('fastingValueInsight').textContent = avgFasting.toFixed(0);

    let status, statusClass;
    if (avgFasting < 100) {
        status = 'Normal';
        statusClass = 'normal';
    } else if (avgFasting < 126) {
        status = 'Prediabetes Range';
        statusClass = 'warning';
    } else {
        status = 'Elevated';
        statusClass = 'danger';
    }

    const statusEl = document.getElementById('fastingStatusInsight');
    statusEl.textContent = status;
    statusEl.className = 'insight-status ' + statusClass;
}

// Disease Risk Reduction Calculations
function calculateRiskReduction() {
    const container = document.getElementById('riskReductionContent');

    if (weightData.length < 2) {
        container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">Need more weight data to calculate risk reduction estimates.</p>';
        return;
    }

    const startWeight = weightData[0].weight;
    const currentWeight = weightData[weightData.length - 1].weight;
    const weightLostLbs = startWeight - currentWeight;
    const weightLostKg = weightLostLbs * 0.453592;
    const weightLostPercent = (weightLostLbs / startWeight) * 100;

    const risks = [];

    // Type 2 Diabetes Risk: 16% reduction per kg lost (capped at 90%)
    if (weightLostKg > 0) {
        const t2dReduction = Math.min(weightLostKg * 16, 90);
        risks.push({
            label: 'Type 2 Diabetes Progression',
            value: t2dReduction,
            basis: `Based on ${weightLostKg.toFixed(1)} kg weight loss (16% per kg)`
        });
    }

    // Cardiovascular Risk
    if (weightLostPercent >= 5) {
        const cvdReduction = weightLostPercent >= 10 ? 20 : 12;
        risks.push({
            label: 'Cardiovascular Events',
            value: cvdReduction,
            basis: `Based on ${weightLostPercent.toFixed(1)}% weight loss (SELECT trial data)`
        });
    }

    // NAFLD Risk
    if (weightLostPercent >= 5) {
        const nafldReduction = weightLostPercent >= 10 ? 40 : 25;
        risks.push({
            label: 'Fatty Liver Disease (NAFLD)',
            value: nafldReduction,
            basis: `Based on ${weightLostPercent.toFixed(1)}% weight loss + glucose stability`
        });
    }

    // All-cause mortality
    if (weightLostKg >= 2.5) {
        risks.push({
            label: 'All-Cause Mortality',
            value: 15,
            basis: 'Based on meta-analysis of 5.5kg+ intentional weight loss'
        });
    }

    if (risks.length === 0) {
        container.innerHTML = `
            <p style="color: var(--text-secondary); font-size: 0.9rem;">
                Risk reduction estimates become available after achieving measurable weight loss.
                Continue your journey - every small step counts toward better health!
            </p>
        `;
        return;
    }

    container.innerHTML = risks.map(r => `
        <div class="risk-item">
            <div class="risk-header">
                <span class="risk-label">${r.label}</span>
                <span class="risk-value">~${r.value.toFixed(0)}% ↓</span>
            </div>
            <div class="risk-bar">
                <div class="risk-bar-fill" style="width: ${Math.min(r.value, 100)}%"></div>
            </div>
            <div class="risk-basis">${r.basis}</div>
        </div>
    `).join('');
}

// Pattern Analysis
function analyzePatterns() {
    analyzeDawnPhenomenon();
    analyzePostMealSpikes();
    analyzeTimeInOptimalRange();
}

// Dawn Phenomenon Detection
function analyzeDawnPhenomenon() {
    if (allData.length === 0) return;

    const byDate = {};
    allData.forEach(d => {
        const dateKey = d.timestamp.toDateString();
        if (!byDate[dateKey]) byDate[dateKey] = [];
        byDate[dateKey].push(d);
    });

    let dawnRises = [];
    Object.values(byDate).forEach(dayData => {
        const nadirReadings = dayData.filter(d => {
            const h = d.timestamp.getHours();
            return h >= 3 && h <= 4;
        });
        const peakReadings = dayData.filter(d => {
            const h = d.timestamp.getHours();
            return h >= 6 && h <= 8;
        });

        if (nadirReadings.length > 0 && peakReadings.length > 0) {
            const nadirAvg = nadirReadings.reduce((s, d) => s + d.glucose, 0) / nadirReadings.length;
            const peakAvg = peakReadings.reduce((s, d) => s + d.glucose, 0) / peakReadings.length;
            const rise = peakAvg - nadirAvg;
            if (rise > 0) dawnRises.push(rise);
        }
    });

    const iconEl = document.getElementById('dawnIcon');
    const valueEl = document.getElementById('dawnValue');

    if (dawnRises.length === 0) {
        valueEl.textContent = 'Insufficient data';
        iconEl.className = 'pattern-icon neutral';
        return;
    }

    const avgRise = dawnRises.reduce((a, b) => a + b, 0) / dawnRises.length;
    const dawnDetected = avgRise > 20;

    if (dawnDetected) {
        valueEl.textContent = `Detected (+${avgRise.toFixed(0)} mg/dL avg rise)`;
        iconEl.className = 'pattern-icon warning';
    } else {
        valueEl.textContent = `Not detected (+${avgRise.toFixed(0)} mg/dL)`;
        iconEl.className = 'pattern-icon good';
    }
}

// Post-Meal Spike Analysis
function analyzePostMealSpikes() {
    if (allData.length === 0) return;

    const spikeReadings = allData.filter(d => d.glucose > 140);
    const totalReadings = allData.length;
    const spikePercent = (spikeReadings.length / totalReadings) * 100;

    const avgSpike = spikeReadings.length > 0
        ? spikeReadings.reduce((s, d) => s + d.glucose, 0) / spikeReadings.length
        : 0;

    const iconEl = document.getElementById('spikeIcon');
    const valueEl = document.getElementById('spikeValue');

    if (spikePercent < 5) {
        valueEl.textContent = `Low frequency (${spikePercent.toFixed(1)}% >140)`;
        iconEl.className = 'pattern-icon good';
    } else if (spikePercent < 15) {
        valueEl.textContent = `Moderate (${spikePercent.toFixed(1)}% >140, avg ${avgSpike.toFixed(0)})`;
        iconEl.className = 'pattern-icon neutral';
    } else {
        valueEl.textContent = `Frequent (${spikePercent.toFixed(1)}% >140, avg ${avgSpike.toFixed(0)})`;
        iconEl.className = 'pattern-icon warning';
    }
}

// Time in Optimal Range for Weight Loss (70-110 mg/dL)
function analyzeTimeInOptimalRange() {
    if (allData.length === 0) return;

    const optimalReadings = allData.filter(d => d.glucose >= 70 && d.glucose <= 110);
    const tirOptimal = (optimalReadings.length / allData.length) * 100;

    const iconEl = document.getElementById('tirIcon');
    const valueEl = document.getElementById('tirValueInsight');

    if (tirOptimal >= 70) {
        valueEl.textContent = `${tirOptimal.toFixed(0)}% in 70-110 (Excellent)`;
        iconEl.className = 'pattern-icon good';
    } else if (tirOptimal >= 50) {
        valueEl.textContent = `${tirOptimal.toFixed(0)}% in 70-110 (Good)`;
        iconEl.className = 'pattern-icon neutral';
    } else {
        valueEl.textContent = `${tirOptimal.toFixed(0)}% in 70-110 (Room to improve)`;
        iconEl.className = 'pattern-icon warning';
    }
}

// Weight Loss Milestones
function renderMilestones() {
    const container = document.getElementById('milestonesGrid');
    if (!container || weightData.length === 0) return;

    const startWeight = weightData[0].weight;
    const currentWeight = weightData[weightData.length - 1].weight;
    const lostPercent = ((startWeight - currentWeight) / startWeight) * 100;

    const milestones = [
        {
            percent: 3,
            label: 'Initial Benefits',
            benefits: 'Improved triglycerides, initial glycemic benefits'
        },
        {
            percent: 5,
            label: 'Meaningful',
            benefits: 'Better BP, improved HDL/LDL, enhanced insulin sensitivity'
        },
        {
            percent: 7,
            label: 'Significant',
            benefits: '58% diabetes risk reduction, improved fasting glucose'
        },
        {
            percent: 10,
            label: 'Major',
            benefits: 'Major CVD benefits, reduced inflammation markers'
        },
        {
            percent: 15,
            label: 'Transformative',
            benefits: 'Sleep apnea improvement, transformative metabolic changes'
        }
    ];

    let foundNext = false;
    container.innerHTML = milestones.map(m => {
        const targetWeight = startWeight * (1 - m.percent / 100);
        const achieved = lostPercent >= m.percent;
        const isNext = !achieved && !foundNext;
        if (isNext) foundNext = true;

        return `
            <div class="milestone ${achieved ? 'achieved' : ''} ${isNext ? 'next' : ''}">
                ${achieved ? '<span class="milestone-badge">Done</span>' : ''}
                ${isNext ? '<span class="milestone-badge">Next</span>' : ''}
                <div class="milestone-percent">${m.percent}%</div>
                <div class="milestone-label">${m.label}</div>
                <div class="milestone-weight">${targetWeight.toFixed(1)} lbs</div>
                <div class="milestone-benefits">${m.benefits}</div>
            </div>
        `;
    }).join('');
}

// ============================================
// DEXA AND LAB DATA INTEGRATION
// ============================================

let dexaData = JSON.parse(localStorage.getItem('dexaData') || '[]');
let labData = JSON.parse(localStorage.getItem('labData') || '[]');

// Biomarker reference ranges for health assessment
const BIOMARKER_REFERENCE = {
    glucose: { optimal: [70, 85], normal: [70, 100], unit: 'mg/dL', name: 'Fasting Glucose' },
    hba1c: { optimal: [4.0, 5.4], normal: [4.0, 5.7], unit: '%', name: 'HbA1c' },
    insulin: { optimal: [2, 6], normal: [2, 25], unit: 'µIU/mL', name: 'Fasting Insulin' },
    triglycerides: { optimal: [0, 100], normal: [0, 150], unit: 'mg/dL', name: 'Triglycerides' },
    hdl: { optimal: [60, 100], normal: [40, 100], unit: 'mg/dL', name: 'HDL Cholesterol', higherBetter: true },
    ldl: { optimal: [0, 100], normal: [0, 130], unit: 'mg/dL', name: 'LDL Cholesterol' },
    totalCholesterol: { optimal: [0, 200], normal: [0, 240], unit: 'mg/dL', name: 'Total Cholesterol' },
    crp: { optimal: [0, 1], normal: [0, 3], unit: 'mg/L', name: 'hs-CRP' },
    homocysteine: { optimal: [5, 10], normal: [5, 15], unit: 'µmol/L', name: 'Homocysteine' },
    vitaminD: { optimal: [40, 60], normal: [30, 100], unit: 'ng/mL', name: 'Vitamin D', higherBetter: true },
    b12: { optimal: [500, 1000], normal: [200, 1100], unit: 'pg/mL', name: 'Vitamin B12', higherBetter: true },
    ferritin: { optimal: [50, 150], normal: [20, 400], unit: 'ng/mL', name: 'Ferritin' },
    tsh: { optimal: [1.0, 2.5], normal: [0.4, 4.0], unit: 'mIU/L', name: 'TSH' },
    alt: { optimal: [0, 25], normal: [0, 40], unit: 'U/L', name: 'ALT' },
    ast: { optimal: [0, 25], normal: [0, 40], unit: 'U/L', name: 'AST' },
    ggt: { optimal: [0, 30], normal: [0, 55], unit: 'U/L', name: 'GGT' },
    uricAcid: { optimal: [3.0, 5.5], normal: [2.5, 7.0], unit: 'mg/dL', name: 'Uric Acid' },
    apoB: { optimal: [0, 80], normal: [0, 100], unit: 'mg/dL', name: 'ApoB' },
    lpA: { optimal: [0, 30], normal: [0, 50], unit: 'nmol/L', name: 'Lp(a)' }
};

// Initialize DEXA and Lab file inputs
function initDexaLabInputs() {
    const dexaInput = document.getElementById('dexaInput');
    const labInput = document.getElementById('labInput');

    if (dexaInput) {
        dexaInput.addEventListener('change', handleDexaFileSelect);
    }
    if (labInput) {
        labInput.addEventListener('change', handleLabFileSelect);
    }

    // Show sections if data exists
    updateDexaLabVisibility();
}

function updateDexaLabVisibility() {
    const bodyCompSection = document.getElementById('bodyCompLabsSection');
    if (bodyCompSection && (dexaData.length > 0 || labData.length > 0)) {
        bodyCompSection.style.display = 'block';
        bodyCompSection.classList.remove('hidden');
        renderAllDexaLabComponents();
    }
}

// Extract text from PDF using PDF.js
async function extractTextFromPDF(file) {
    // Check if PDF.js is loaded
    if (typeof pdfjsLib === 'undefined') {
        throw new Error('PDF.js library not loaded. Please refresh the page.');
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
    }

    return fullText;
}

// Handle DEXA file upload
async function handleDexaFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        showNotification('Processing DEXA scan...', 'info');
        const text = await extractTextFromPDF(file);
        const dexaResult = parseDexaText(text, file.name);

        if (dexaResult) {
            // Check for duplicate dates
            const existingIndex = dexaData.findIndex(d => d.date === dexaResult.date);
            if (existingIndex >= 0) {
                dexaData[existingIndex] = dexaResult;
            } else {
                dexaData.push(dexaResult);
            }
            dexaData.sort((a, b) => new Date(a.date) - new Date(b.date));
            localStorage.setItem('dexaData', JSON.stringify(dexaData));

            updateDexaLabVisibility();
            showNotification('DEXA scan processed successfully!', 'success');
        } else {
            showNotification('Could not parse DEXA data. Please check the PDF format.', 'error');
        }
    } catch (error) {
        console.error('DEXA parsing error:', error);
        showNotification('Error processing DEXA file: ' + error.message, 'error');
    }

    event.target.value = '';
}

// Handle Lab file upload
async function handleLabFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        showNotification('Processing lab report...', 'info');
        const text = await extractTextFromPDF(file);
        const labResult = parseLabText(text, file.name);

        if (labResult && Object.keys(labResult.biomarkers).length > 0) {
            // Check for duplicate dates
            const existingIndex = labData.findIndex(d => d.date === labResult.date);
            if (existingIndex >= 0) {
                labData[existingIndex] = labResult;
            } else {
                labData.push(labResult);
            }
            labData.sort((a, b) => new Date(a.date) - new Date(b.date));
            localStorage.setItem('labData', JSON.stringify(labData));

            updateDexaLabVisibility();
            showNotification('Lab report processed successfully!', 'success');
        } else {
            showNotification('Could not parse lab data. Please check the PDF format.', 'error');
        }
    } catch (error) {
        console.error('Lab parsing error:', error);
        showNotification('Error processing lab file: ' + error.message, 'error');
    }

    event.target.value = '';
}

// Parse DEXA text - supports multiple providers
function parseDexaText(text, filename) {
    const result = {
        date: null,
        provider: 'Unknown',
        bodyFatPercent: null,
        leanMass: null,
        fatMass: null,
        boneDensity: null,
        visceralFat: null,
        androidFat: null,
        gynoidFat: null,
        agRatio: null,
        rmi: null,
        bmi: null,
        totalMass: null
    };

    // Detect provider
    if (text.includes('Live Lean Rx') || text.includes('LiveLeanRx') || text.includes('HEALTHIER LIFE')) {
        result.provider = 'Live Lean Rx';
    } else if (text.includes('DexaFit')) {
        result.provider = 'DexaFit';
    } else if (text.includes('BodySpec')) {
        result.provider = 'BodySpec';
    } else if (text.includes('DEXA') || text.includes('DXA')) {
        result.provider = 'Generic DEXA';
    }

    // === LIVE LEAN RX SPECIFIC PARSING ===
    if (result.provider === 'Live Lean Rx') {
        // Extract date from "Measured: 12/17/2025" or first date in data row
        const measuredMatch = text.match(/Measured:\s*(\d{1,2}\/\d{1,2}\/\d{4})/);
        if (measuredMatch) {
            const parsed = new Date(measuredMatch[1]);
            if (!isNaN(parsed)) {
                result.date = parsed.toISOString().split('T')[0];
            }
        }

        // Find the data row after "Measured Date   Total Body Fat %   Total Mass..."
        // Format: 12/17/2025   23.9   228.8   54.6   166.0   8.1   174.2 lbs
        // This matches: date, body fat %, total mass, fat mass, lean mass, bmc, fat free
        const dataRowMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{4})\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*lbs/);
        if (dataRowMatch) {
            result.bodyFatPercent = parseFloat(dataRowMatch[2]);
            result.totalMass = parseFloat(dataRowMatch[3]);
            result.fatMass = parseFloat(dataRowMatch[4]);
            result.leanMass = parseFloat(dataRowMatch[5]);
            // dataRowMatch[6] is BMC, [7] is Fat Free

            // Use this date if we didn't get one from Measured field
            if (!result.date) {
                const parsed = new Date(dataRowMatch[1]);
                if (!isNaN(parsed)) {
                    result.date = parsed.toISOString().split('T')[0];
                }
            }
        }

        // Extract Android fat: "Android   27.6%   18.0   5.0 lbs"
        const androidMatch = text.match(/Android\s+([\d.]+)%/);
        if (androidMatch) {
            result.androidFat = parseFloat(androidMatch[1]);
        }

        // Extract Gynoid fat: "Gynoid   23.5%   35.4"
        const gynoidMatch = text.match(/Gynoid\s+([\d.]+)%/);
        if (gynoidMatch) {
            result.gynoidFat = parseFloat(gynoidMatch[1]);
        }

        // Calculate A/G ratio if both are present
        if (result.androidFat && result.gynoidFat) {
            result.agRatio = parseFloat((result.androidFat / result.gynoidFat).toFixed(2));
        }

        // Extract VAT (Visceral Adipose Tissue) - look for volume in cubic inches
        // Format in VAT section: "12/17/2025   52.4   1.08   31.69" where 31.69 is volume
        const vatMatch = text.match(/VAT[\s\S]*?(\d{1,2}\/\d{1,2}\/\d{4})\s+[\d.]+\s+([\d.]+)\s+([\d.]+)/);
        if (vatMatch) {
            // vatMatch[2] is fat mass in lbs, vatMatch[3] is volume in cubic inches
            result.visceralFat = parseFloat(vatMatch[3]); // Using volume
        }

        // Return if we got the essential data
        if (result.bodyFatPercent !== null) {
            return result;
        }
    }

    // === GENERIC PARSING (fallback for other providers) ===

    // Extract date - try multiple formats
    if (!result.date) {
        const datePatterns = [
            /(?:Date|Scan Date|Test Date)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
            /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
            /([A-Z][a-z]+ \d{1,2},? \d{4})/i
        ];

        for (const pattern of datePatterns) {
            const match = text.match(pattern);
            if (match) {
                const parsed = new Date(match[1]);
                if (!isNaN(parsed)) {
                    result.date = parsed.toISOString().split('T')[0];
                    break;
                }
            }
        }
    }

    if (!result.date) {
        result.date = new Date().toISOString().split('T')[0];
    }

    // Extract body fat percentage
    const fatPatterns = [
        /(?:Total|Body)\s*(?:Body\s*)?Fat\s*(?:Percent|%)[:\s]*(\d+\.?\d*)\s*%?/i,
        /(?:Body Fat|BF)[:\s]*(\d+\.?\d*)\s*%/i,
        /(\d+\.?\d*)\s*%\s*(?:Total|Body)\s*Fat/i,
        /Total\s+(\d+\.?\d*)%/  // For "Total   23.9%" format
    ];
    for (const pattern of fatPatterns) {
        const match = text.match(pattern);
        if (match) {
            result.bodyFatPercent = parseFloat(match[1]);
            break;
        }
    }

    // Extract lean mass (lbs or kg)
    const leanPatterns = [
        /Lean\s*(?:Mass|Tissue)?\s*(?:\(lbs\))?\s*[\s:]+(\d+\.?\d*)\s*(?:lbs)?/i,
        /(\d+\.?\d*)\s*lbs?\s*Lean/i
    ];
    for (const pattern of leanPatterns) {
        const match = text.match(pattern);
        if (match) {
            result.leanMass = parseFloat(match[1]);
            break;
        }
    }

    // Extract fat mass
    const fatMassPatterns = [
        /Fat\s*(?:Mass|Tissue)?\s*(?:\(lbs\))?\s*[\s:]+(\d+\.?\d*)\s*(?:lbs)?/i,
        /(\d+\.?\d*)\s*lbs?\s*Fat\s*Mass/i
    ];
    for (const pattern of fatMassPatterns) {
        const match = text.match(pattern);
        if (match) {
            result.fatMass = parseFloat(match[1]);
            break;
        }
    }

    // Extract bone mineral density (T-score or g/cm²)
    const bmdPatterns = [
        /(?:BMD|Bone Mineral Density|T-Score)[:\s]*(-?\d+\.?\d*)/i,
        /(?:Spine|Hip|Total)\s*(?:BMD|T-Score)[:\s]*(-?\d+\.?\d*)/i
    ];
    for (const pattern of bmdPatterns) {
        const match = text.match(pattern);
        if (match) {
            result.boneDensity = parseFloat(match[1]);
            break;
        }
    }

    // Extract visceral fat
    const visceralPatterns = [
        /(?:Visceral|VAT|Visceral Fat)[:\s]*(\d+\.?\d*)\s*(?:g|lbs?|cm²)?/i,
        /VAT\s*(?:Mass|Area|Volume)?[:\s]*(\d+\.?\d*)/i
    ];
    for (const pattern of visceralPatterns) {
        const match = text.match(pattern);
        if (match) {
            result.visceralFat = parseFloat(match[1]);
            break;
        }
    }

    // Extract android fat (belly region)
    const androidPatterns = [
        /Android\s*(?:Fat|%|Region)?[:\s]*(\d+\.?\d*)\s*%?/i
    ];
    for (const pattern of androidPatterns) {
        const match = text.match(pattern);
        if (match) {
            result.androidFat = parseFloat(match[1]);
            break;
        }
    }

    // Extract gynoid fat (hip region)
    const gynoidPatterns = [
        /Gynoid\s*(?:Fat|%|Region)?[:\s]*(\d+\.?\d*)\s*%?/i
    ];
    for (const pattern of gynoidPatterns) {
        const match = text.match(pattern);
        if (match) {
            result.gynoidFat = parseFloat(match[1]);
            break;
        }
    }

    // Extract A/G ratio
    const agPatterns = [
        /(?:A\/G|Android\/Gynoid|AG)\s*Ratio?[:\s]*(\d+\.?\d*)/i
    ];
    for (const pattern of agPatterns) {
        const match = text.match(pattern);
        if (match) {
            result.agRatio = parseFloat(match[1]);
            break;
        }
    }

    // Extract BMI if present
    const bmiPatterns = [
        /BMI[:\s]*(\d+\.?\d*)/i
    ];
    for (const pattern of bmiPatterns) {
        const match = text.match(pattern);
        if (match) {
            result.bmi = parseFloat(match[1]);
            break;
        }
    }

    // Extract total mass
    const totalMassPatterns = [
        /(?:Total Mass|Total Weight|Weight)[:\s]*(\d+\.?\d*)\s*(?:lbs?|pounds?|kg)?/i
    ];
    for (const pattern of totalMassPatterns) {
        const match = text.match(pattern);
        if (match) {
            result.totalMass = parseFloat(match[1]);
            break;
        }
    }

    // Only return if we got at least body fat percent
    if (result.bodyFatPercent !== null) {
        return result;
    }

    return null;
}

// Parse Labcorp and other lab formats
function parseLabText(text, filename) {
    const result = {
        date: null,
        provider: 'Unknown',
        biomarkers: {}
    };

    // Detect provider
    const isLabcorp = text.includes('Labcorp') || text.includes('Laboratory Corporation');
    if (isLabcorp) {
        result.provider = 'Labcorp';
    } else if (text.includes('Quest')) {
        result.provider = 'Quest Diagnostics';
    } else {
        result.provider = 'Lab';
    }

    // Extract date
    const datePatterns = [
        /(?:Date Collected|Collection Date|Collected)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
        /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/
    ];

    for (const pattern of datePatterns) {
        const match = text.match(pattern);
        if (match) {
            const parsed = new Date(match[1]);
            if (!isNaN(parsed)) {
                result.date = parsed.toISOString().split('T')[0];
                break;
            }
        }
    }

    if (!result.date) {
        result.date = new Date().toISOString().split('T')[0];
    }

    // Labcorp-specific parser
    // Format: "TestName   A,   01   VALUE   PREV_VALUE   DATE   Units   Reference"
    // The "A," is optional, "01" is a marker we need to skip
    if (isLabcorp) {
        // Labcorp format varies by test type:
        // NMR tests: "TestName   A,   01   VALUE   PREV_VALUE   MM/DD/YYYY   Units"
        // Other tests: "TestName   VALUE   Reference" or "TestName   A,   01   VALUE   Units"

        // Helper: extract value using multiple pattern strategies
        // Labcorp format: NMR tests use "01" marker, standard tests use "02" marker
        function extractLabcorpValue(text, testPattern, valuePattern = '(\\d+\\.?\\d*)', bounds) {
            // Strategy 1: Test name followed by "02" marker (standard Labcorp tests)
            // Format: "Glucose 02 73 82 10/14/2025 mg/dL"
            let pattern = new RegExp(
                testPattern + '\\s+0[12]\\s+' + valuePattern + '\\s+[\\d.<>]',
                'i'
            );
            let match = text.match(pattern);
            if (match && match[1]) {
                const val = parseFloat(match[1]);
                if (!isNaN(val) && val >= bounds.min && val <= bounds.max) {
                    return val;
                }
            }

            // Strategy 2: Test name with "A," flag followed by "01" marker (NMR tests)
            // Format: "HDL-C A, 01 53 57 10/14/2025"
            pattern = new RegExp(
                testPattern + '\\s+A,\\s+0[12]\\s+' + valuePattern + '\\s+[\\d.<>]',
                'i'
            );
            match = text.match(pattern);
            if (match && match[1]) {
                const val = parseFloat(match[1]);
                if (!isNaN(val) && val >= bounds.min && val <= bounds.max) {
                    return val;
                }
            }

            // Strategy 3: Full pattern with date (most specific)
            // Format: "TestName 02 VALUE PREV_VALUE MM/DD/YYYY Units"
            pattern = new RegExp(
                testPattern + '\\s+(?:A,\\s+)?0[12]\\s+' + valuePattern + '\\s+(?:\\d+\\.?\\d*\\s+)?\\d{2}\\/\\d{2}\\/\\d{4}',
                'i'
            );
            match = text.match(pattern);
            if (match && match[1]) {
                const val = parseFloat(match[1]);
                if (!isNaN(val) && val >= bounds.min && val <= bounds.max) {
                    return val;
                }
            }

            // Strategy 4: Simple pattern - test name followed by value (fallback)
            pattern = new RegExp(
                testPattern + '\\s+' + valuePattern + '\\s+(?:\\d|[a-zA-Z/<>])',
                'i'
            );
            match = text.match(pattern);
            if (match && match[1]) {
                const val = parseFloat(match[1]);
                if (!isNaN(val) && val >= bounds.min && val <= bounds.max) {
                    return val;
                }
            }

            return null;
        }

        const labcorpTests = {
            // Glucose: may appear as "Glucose   92   70-99 mg/dL"
            glucose: { pattern: 'Glucose(?!,)', valuePattern: '(\\d{2,3})', min: 40, max: 400 },
            // HbA1c: "Hemoglobin A1c   5.4   <5.7 %"
            hba1c: { pattern: 'Hemoglobin A1c', valuePattern: '(\\d+\\.\\d)', min: 3, max: 15 },
            // Insulin: "Insulin   5.2   2.6-24.9"
            insulin: { pattern: 'Insulin(?!\\s+Res)', valuePattern: '(\\d+\\.?\\d*)', min: 1, max: 100 },
            // Triglycerides
            triglycerides: { pattern: 'Triglycerides', valuePattern: '(\\d{2,4})', min: 20, max: 1000 },
            // HDL
            hdl: { pattern: 'HDL-?C?(?!\\s*P)', valuePattern: '(\\d{2,3})', min: 15, max: 150 },
            // LDL
            ldl: { pattern: 'LDL-?C?\\s*(?:\\([^)]*\\))?', valuePattern: '(\\d{2,3})', min: 20, max: 400 },
            // Total Cholesterol
            totalCholesterol: { pattern: 'Cholesterol,?\\s*Total', valuePattern: '(\\d{2,3})', min: 80, max: 500 },
            // CRP: "C-Reactive Protein, Cardiac   0.5   <1.0"
            crp: { pattern: 'C-?Reactive Protein[,\\s]+(?:Cardiac)?', valuePattern: '<?([\\d.]+)', min: 0.1, max: 50 },
            // Homocysteine: "Homocyst(e)ine   8.2   <10.4"
            homocysteine: { pattern: 'Homocyst\\(?e?\\)?ine', valuePattern: '(\\d+\\.?\\d*)', min: 3, max: 50 },
            // Vitamin D: "Vitamin D, 25-Hydroxy   45   30-100"
            vitaminD: { pattern: 'Vitamin D,?\\s*25-?Hydroxy', valuePattern: '(\\d{1,3})', min: 4, max: 200 },
            // B12: "Vitamin B12   650   232-1245"
            b12: { pattern: 'Vitamin B-?12', valuePattern: '[<>]?(\\d{3,4})', min: 100, max: 2000 },
            // Ferritin: "Ferritin   125   30-400"
            ferritin: { pattern: 'Ferritin', valuePattern: '(\\d{1,4})', min: 5, max: 1500 },
            // TSH: "TSH   1.5   0.45-4.5"
            tsh: { pattern: 'TSH(?!\\s+[A-Z])', valuePattern: '(\\d+\\.?\\d*)', min: 0.1, max: 20 },
            // ALT
            alt: { pattern: 'ALT\\s*(?:\\(SGPT\\))?', valuePattern: '(\\d{1,3})', min: 5, max: 500 },
            // AST
            ast: { pattern: 'AST\\s*(?:\\(SGOT\\))?', valuePattern: '(\\d{1,3})', min: 5, max: 500 },
            // GGT
            ggt: { pattern: 'GGT', valuePattern: '(\\d{1,3})', min: 5, max: 500 },
            // Uric Acid: "Uric Acid   5.2   3.4-7.0"
            uricAcid: { pattern: 'Uric Acid', valuePattern: '(\\d+\\.?\\d*)', min: 2, max: 15 },
            // ApoB
            apoB: { pattern: 'Apo(?:lipoprotein)?\\s*B(?!\\s*\\/)', valuePattern: '(\\d{2,3})', min: 30, max: 250 },
            // Lp(a)
            lpA: { pattern: 'Lp\\s*\\(?a\\)?', valuePattern: '[<>]?(\\d+\\.?\\d*)', min: 0, max: 500 },
            // Free T4
            freeT4: { pattern: '(?:Thyroxine|T4)[,\\s]+(?:\\(T4\\)\\s+)?Free', valuePattern: '(\\d+\\.?\\d*)', min: 0.5, max: 3 },
            // Free T3
            freeT3: { pattern: '(?:Triiodothyronine|T3)[,\\s]+(?:\\(T3\\)[,\\s]+)?Free', valuePattern: '(\\d+\\.?\\d*)', min: 1, max: 6 },
            // Cortisol
            cortisol: { pattern: 'Cortisol', valuePattern: '(\\d+\\.?\\d*)', min: 2, max: 30 },
            // Testosterone
            testosterone: { pattern: 'Testosterone(?!,?\\s+Free)', valuePattern: '[<>]?(\\d{2,4})', min: 50, max: 1500 },
            // Testosterone Free
            testosteroneFree: { pattern: 'Testosterone,?\\s+Free', valuePattern: '(\\d+\\.?\\d*)', min: 1, max: 50 },
            // Iron
            iron: { pattern: 'Iron(?!\\s+Bind)', valuePattern: '(\\d{2,3})', min: 20, max: 300 },
            // TIBC
            tibc: { pattern: '(?:Iron Bind[^0-9]*|TIBC)', valuePattern: '(\\d{2,4})', min: 200, max: 500 },
            // Magnesium
            magnesium: { pattern: 'Magnesium', valuePattern: '(\\d+\\.?\\d*)', min: 1, max: 4 },
            // Phosphorus
            phosphorus: { pattern: 'Phosphorus', valuePattern: '(\\d+\\.?\\d*)', min: 1, max: 8 },
            // ESR
            esr: { pattern: '(?:Sed(?:imentation)?\\s*Rate|ESR)', valuePattern: '(\\d{1,3})', min: 0, max: 100 },
            // Folate
            folate: { pattern: 'Folate(?!,?\\s*RBC)', valuePattern: '[<>]?(\\d+\\.?\\d*)', min: 2, max: 50 },
            // ApoA1
            apoA1: { pattern: 'Apo(?:lipoprotein)?\\s*A-?1', valuePattern: '(\\d{2,3})', min: 80, max: 250 }
        };

        for (const [key, testDef] of Object.entries(labcorpTests)) {
            const value = extractLabcorpValue(text, testDef.pattern, testDef.valuePattern, testDef);

            if (value !== null) {
                result.biomarkers[key] = value;
            }
        }

        return result;
    }

    // Generic parser for non-Labcorp labs
    function extractValue(text, patterns) {
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                const value = parseFloat(match[1]);
                if (!isNaN(value) && value > 0) {
                    return value;
                }
            }
        }
        return null;
    }

    const biomarkerDefs = {
        glucose: {
            patterns: [
                /Glucose[,\s]+(?:Fasting)?[\s\S]{0,30}?(?<![\d.])(\d{2,3})(?!\d)(?=\s|mg|$)/i,
                /Glucose[\s]{2,}(\d{2,3})(?!\d)/i,
                /(?:Glucose|Fasting Glucose|Blood Glucose)[:\s]+(\d{2,3})(?!\d)/i
            ],
            min: 40, max: 400
        },
        hba1c: {
            patterns: [
                /Hemoglobin A1c[\s\S]{0,20}?(\d+\.?\d*)[\s]*%?/i,
                /HbA1c[\s\S]{0,20}?(\d+\.?\d*)/i,
                /Hgb A1[Cc][\s\S]{0,20}?(\d+\.?\d*)/i
            ],
            min: 3, max: 15
        },
        insulin: {
            patterns: [
                /Insulin[,\s]+(?:Fasting)?[\s\S]{0,30}?(\d+\.?\d*)/i,
                /(?:Fasting\s+)?Insulin[\s]{2,}(\d+\.?\d*)/i
            ],
            min: 0.1, max: 100
        },
        triglycerides: {
            patterns: [
                /Triglycerides[\s\S]{0,30}?(?<![\d.])(\d{2,4})(?!\d)/i
            ],
            min: 20, max: 1000
        },
        hdl: {
            patterns: [
                /(?<!Non-)HDL[\s\-]?(?:Cholesterol|C)?[\s\S]{0,20}?(?<![\d.])(\d{2,3})(?!\d)/i
            ],
            min: 15, max: 150
        },
        ldl: {
            patterns: [
                /LDL[\s\-]?(?:Cholesterol|C)?(?:\s*\([^)]*\))?[\s\S]{0,30}?(?<![\d.])(\d{2,3})(?!\d)/i
            ],
            min: 20, max: 400
        },
        totalCholesterol: {
            patterns: [
                /(?:Total\s+)?Cholesterol[,]?(?:\s+Total)?[\s\S]{0,20}?(?<![\d.])(\d{3})(?!\d)/i
            ],
            min: 80, max: 500
        },
        crp: {
            patterns: [
                /(?:hs-?)?C-?Reactive Protein[\s\S]{0,30}?(\d+\.?\d*)/i
            ],
            min: 0.01, max: 50
        },
        vitaminD: {
            patterns: [
                /(?:Vitamin\s+D|25-?Hydroxy)[\s\S]{0,40}?(?<![\d.])(\d{1,3}\.?\d*)(?!\d)/i
            ],
            min: 4, max: 200
        },
        b12: {
            patterns: [
                /(?:Vitamin\s+)?B[\s-]?12[\s\S]{0,30}?(?<![\d.])(\d{3,4})(?!\d)/i
            ],
            min: 100, max: 2000
        },
        tsh: {
            patterns: [
                /TSH[\s\S]{0,30}?(\d+\.?\d*)/i
            ],
            min: 0.01, max: 20
        }
    };

    for (const [key, def] of Object.entries(biomarkerDefs)) {
        const value = extractValue(text, def.patterns);
        if (value !== null && value >= def.min && value <= def.max) {
            result.biomarkers[key] = value;
        }
    }

    return result;
}

// Calculate metabolic health score
function calculateMetabolicHealthScore() {
    if (labData.length === 0 && dexaData.length === 0) return null;

    const scores = {
        insulinSensitivity: null,
        bodyComposition: null,
        inflammation: null,
        cardiovascular: null
    };

    const latestLab = labData.length > 0 ? labData[labData.length - 1] : null;
    const latestDexa = dexaData.length > 0 ? dexaData[dexaData.length - 1] : null;

    // Insulin sensitivity score (from HOMA-IR if both glucose and insulin available)
    if (latestLab && latestLab.biomarkers.glucose && latestLab.biomarkers.insulin) {
        const homaIR = (latestLab.biomarkers.glucose * latestLab.biomarkers.insulin) / 405;
        if (homaIR < 1) scores.insulinSensitivity = 100;
        else if (homaIR < 1.5) scores.insulinSensitivity = 85;
        else if (homaIR < 2) scores.insulinSensitivity = 70;
        else if (homaIR < 2.5) scores.insulinSensitivity = 55;
        else if (homaIR < 3) scores.insulinSensitivity = 40;
        else scores.insulinSensitivity = 25;
    } else if (latestLab && latestLab.biomarkers.hba1c) {
        const a1c = latestLab.biomarkers.hba1c;
        if (a1c < 5.0) scores.insulinSensitivity = 100;
        else if (a1c < 5.4) scores.insulinSensitivity = 85;
        else if (a1c < 5.7) scores.insulinSensitivity = 70;
        else if (a1c < 6.0) scores.insulinSensitivity = 50;
        else scores.insulinSensitivity = 30;
    }

    // Body composition score
    if (latestDexa && latestDexa.bodyFatPercent) {
        const bf = latestDexa.bodyFatPercent;
        // Scoring for males (adjust for females would be +8-10%)
        if (bf < 15) scores.bodyComposition = 100;
        else if (bf < 20) scores.bodyComposition = 85;
        else if (bf < 25) scores.bodyComposition = 70;
        else if (bf < 30) scores.bodyComposition = 55;
        else if (bf < 35) scores.bodyComposition = 40;
        else scores.bodyComposition = 25;
    }

    // Inflammation score
    if (latestLab && latestLab.biomarkers.crp) {
        const crp = latestLab.biomarkers.crp;
        if (crp < 0.5) scores.inflammation = 100;
        else if (crp < 1) scores.inflammation = 85;
        else if (crp < 2) scores.inflammation = 70;
        else if (crp < 3) scores.inflammation = 50;
        else scores.inflammation = 30;
    }

    // Cardiovascular score
    if (latestLab) {
        const cvFactors = [];
        if (latestLab.biomarkers.triglycerides) {
            const tg = latestLab.biomarkers.triglycerides;
            if (tg < 80) cvFactors.push(100);
            else if (tg < 100) cvFactors.push(85);
            else if (tg < 150) cvFactors.push(70);
            else cvFactors.push(40);
        }
        if (latestLab.biomarkers.hdl) {
            const hdl = latestLab.biomarkers.hdl;
            if (hdl > 60) cvFactors.push(100);
            else if (hdl > 50) cvFactors.push(80);
            else if (hdl > 40) cvFactors.push(60);
            else cvFactors.push(40);
        }
        if (cvFactors.length > 0) {
            scores.cardiovascular = cvFactors.reduce((a, b) => a + b) / cvFactors.length;
        }
    }

    // Calculate overall score
    const validScores = Object.values(scores).filter(s => s !== null);
    if (validScores.length === 0) return null;

    const overall = Math.round(validScores.reduce((a, b) => a + b) / validScores.length);

    return { overall, components: scores };
}

// Render all DEXA/Lab components
function renderAllDexaLabComponents() {
    try {
        renderMetabolicScore();
        renderBodyCompMetrics();
        renderDexaTrends();
        renderLabBiomarkers();
        renderCardiovascularRisk();
        renderLongevityFlags();
        renderCGMLabCorrelation();
    } catch (error) {
        console.error('Error in renderAllDexaLabComponents:', error);
    }
}

// Render metabolic health score
function renderMetabolicScore() {
    const container = document.getElementById('metabolicScoreContainer');
    const scoreBadge = document.getElementById('metabolicScoreBadge');
    const scoreValueEl = document.getElementById('metabolicScoreValue');

    if (!container) return;

    const scoreData = calculateMetabolicHealthScore();

    if (!scoreData) {
        container.innerHTML = '<p class="no-data-message">Upload DEXA or lab data to see your metabolic health score</p>';
        if (scoreValueEl) scoreValueEl.textContent = '--';
        return;
    }

    const { overall, components } = scoreData;

    // Update the badge in the header
    if (scoreValueEl) scoreValueEl.textContent = overall;
    if (scoreBadge) {
        scoreBadge.classList.remove('excellent', 'good', 'fair', 'poor');
        if (overall >= 85) scoreBadge.classList.add('excellent');
        else if (overall >= 70) scoreBadge.classList.add('good');
        else if (overall >= 55) scoreBadge.classList.add('fair');
        else scoreBadge.classList.add('poor');
    }

    // Build horizontal component cards
    const componentCards = [];
    if (components.insulinSensitivity !== null) {
        componentCards.push({ name: 'Insulin Sensitivity', score: components.insulinSensitivity, icon: '🔬' });
    }
    if (components.bodyComposition !== null) {
        componentCards.push({ name: 'Body Composition', score: components.bodyComposition, icon: '💪' });
    }
    if (components.inflammation !== null) {
        componentCards.push({ name: 'Inflammation', score: components.inflammation, icon: '🔥' });
    }
    if (components.cardiovascular !== null) {
        componentCards.push({ name: 'Cardiovascular', score: Math.round(components.cardiovascular), icon: '❤️' });
    }

    // Horizontal layout for score components
    container.innerHTML = `
        <div class="score-components-horizontal">
            ${componentCards.map(c => {
                const colorClass = c.score >= 70 ? 'good' : c.score >= 50 ? 'moderate' : 'poor';
                return `
                    <div class="component-item ${colorClass}">
                        <div class="component-icon">${c.icon}</div>
                        <div class="component-details">
                            <span class="component-name">${c.name}</span>
                            <div class="component-score-bar">
                                <div class="bar-track">
                                    <div class="bar-fill" style="width: ${c.score}%"></div>
                                </div>
                                <span class="score-value">${c.score}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// Render body composition metrics - DEXA Analysis section (similar to Lab Biomarkers)
function renderBodyCompMetrics() {
    const container = document.getElementById('bodyCompMetricsContainer');
    if (!container || dexaData.length === 0) {
        if (container) container.innerHTML = '';
        return;
    }

    const latest = dexaData[dexaData.length - 1];

    // Define DEXA metrics with optimal ranges
    const dexaMetrics = {
        bodyFatPercent: { name: 'Body Fat', unit: '%', optimal: [10, 20], lowerBetter: true },
        leanMass: { name: 'Lean Mass', unit: 'lbs', optimal: [140, 200], higherBetter: true },
        fatMass: { name: 'Fat Mass', unit: 'lbs', optimal: [20, 40], lowerBetter: true },
        visceralFat: { name: 'Visceral Fat', unit: 'in³', optimal: [0, 52], lowerBetter: true },
        androidFat: { name: 'Android Fat', unit: '%', optimal: [0, 25], lowerBetter: true },
        agRatio: { name: 'A/G Ratio', unit: '', optimal: [0, 1.0], lowerBetter: true }
    };

    // Build metrics HTML similar to biomarker-item style
    let metricsHtml = '';
    for (const [key, ref] of Object.entries(dexaMetrics)) {
        const value = latest[key];
        if (value === null || value === undefined) continue;

        let status = 'normal';
        if (ref.higherBetter) {
            if (value >= ref.optimal[0]) status = 'optimal';
            else status = 'high-risk';
        } else if (ref.lowerBetter) {
            if (value <= ref.optimal[1]) status = 'optimal';
            else status = 'high-risk';
        } else {
            if (value >= ref.optimal[0] && value <= ref.optimal[1]) status = 'optimal';
            else status = 'high-risk';
        }

        const optimalText = ref.higherBetter ? `>${ref.optimal[0]}` :
                           ref.lowerBetter ? `<${ref.optimal[1]}` :
                           `${ref.optimal[0]}-${ref.optimal[1]}`;

        metricsHtml += `
            <div class="biomarker-item ${status}">
                <div class="biomarker-name">${ref.name}</div>
                <div class="biomarker-value">${value.toFixed(1)} ${ref.unit}</div>
                <div class="biomarker-range">Optimal: ${optimalText}</div>
                <div class="biomarker-status">${status === 'optimal' ? 'Optimal' : 'Review'}</div>
            </div>
        `;
    }

    // Create section with header similar to Lab Biomarkers
    container.innerHTML = `
        <div class="section-header">
            <h3>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                </svg>
                DEXA Analysis
            </h3>
            <div class="dexa-provider-info">
                <span class="provider-name">${latest.provider}</span>
                <span class="scan-date">${new Date(latest.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
        </div>
        <div class="biomarker-categories">
            <div class="biomarker-category">
                <h4>Body Composition</h4>
                <div class="biomarker-grid">${metricsHtml}</div>
            </div>
        </div>
    `;
}

// Render DEXA trends chart
function renderDexaTrends() {
    const container = document.getElementById('dexaTrendsContainer');
    const canvas = document.getElementById('dexaTrendsChart');
    if (!container || !canvas || dexaData.length < 2) {
        if (container && dexaData.length < 2) {
            container.innerHTML = '<p class="no-data-message">Need at least 2 DEXA scans to show trends</p>';
        }
        return;
    }

    container.innerHTML = '<canvas id="dexaTrendsChart"></canvas>';
    const ctx = document.getElementById('dexaTrendsChart').getContext('2d');

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: dexaData.map(d => new Date(d.date).toLocaleDateString()),
            datasets: [
                {
                    label: 'Body Fat %',
                    data: dexaData.map(d => d.bodyFatPercent),
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    yAxisID: 'y'
                },
                {
                    label: 'Lean Mass (lbs)',
                    data: dexaData.map(d => d.leanMass),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Body Composition Over Time'
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: 'Body Fat %' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: { display: true, text: 'Lean Mass (lbs)' },
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });
}

// Render lab biomarkers
function renderLabBiomarkers() {
    const container = document.getElementById('labBiomarkersContainer');
    if (!container || labData.length === 0) {
        if (container) container.innerHTML = '<p class="no-data-message">No lab data available</p>';
        return;
    }

    const latest = labData[labData.length - 1];
    const biomarkers = latest.biomarkers;

    const categories = {
        'Glucose Metabolism': ['glucose', 'hba1c', 'insulin'],
        'Lipids': ['totalCholesterol', 'ldl', 'hdl', 'triglycerides', 'apoB', 'lpA'],
        'Inflammation': ['crp', 'homocysteine', 'uricAcid'],
        'Vitamins & Minerals': ['vitaminD', 'b12', 'ferritin'],
        'Thyroid & Liver': ['tsh', 'alt', 'ast', 'ggt']
    };

    let html = '';

    for (const [category, markers] of Object.entries(categories)) {
        const categoryMarkers = markers.filter(m => biomarkers[m] !== undefined);
        if (categoryMarkers.length === 0) continue;

        html += `<div class="biomarker-category"><h4>${category}</h4><div class="biomarker-grid">`;

        for (const marker of categoryMarkers) {
            const ref = BIOMARKER_REFERENCE[marker];
            const value = biomarkers[marker];
            let status = 'normal';

            if (ref.higherBetter) {
                if (value >= ref.optimal[0]) status = 'optimal';
                else if (value >= ref.normal[0]) status = 'normal';
                else status = 'high-risk';
            } else {
                if (value >= ref.optimal[0] && value <= ref.optimal[1]) status = 'optimal';
                else if (value >= ref.normal[0] && value <= ref.normal[1]) status = 'normal';
                else status = 'high-risk';
            }

            html += `
                <div class="biomarker-item ${status}">
                    <div class="biomarker-name">${ref.name}</div>
                    <div class="biomarker-value">${value} ${ref.unit}</div>
                    <div class="biomarker-range">Optimal: ${ref.optimal[0]}-${ref.optimal[1]}</div>
                    <div class="biomarker-status">${status === 'optimal' ? 'Optimal' : status === 'normal' ? 'Normal' : 'Review'}</div>
                </div>
            `;
        }

        html += '</div></div>';
    }

    container.innerHTML = html || '<p class="no-data-message">No recognized biomarkers found</p>';
}

// Render cardiovascular risk assessment
function renderCardiovascularRisk() {
    const container = document.getElementById('cvRiskContainer');
    if (!container || labData.length === 0) {
        if (container) container.innerHTML = '<p class="no-data-message">No lab data for CV risk assessment</p>';
        return;
    }

    const latest = labData[labData.length - 1];
    const b = latest.biomarkers;

    const risks = [];

    // TG/HDL ratio - insulin resistance marker
    if (b.triglycerides && b.hdl) {
        const ratio = b.triglycerides / b.hdl;
        let risk = 'low';
        let label = 'TG/HDL Ratio';
        let interpretation = '';

        if (ratio < 1.5) {
            interpretation = 'Excellent - indicates good insulin sensitivity';
        } else if (ratio < 2.5) {
            risk = 'moderate';
            interpretation = 'Acceptable - some insulin resistance possible';
        } else {
            risk = 'high';
            interpretation = 'Elevated - indicates insulin resistance';
        }

        risks.push({ label, value: ratio.toFixed(2), risk, interpretation });
    }

    // HOMA-IR calculation
    if (b.glucose && b.insulin) {
        const homaIR = (b.glucose * b.insulin) / 405;
        let risk = 'low';
        let interpretation = '';

        if (homaIR < 1.0) {
            interpretation = 'Excellent insulin sensitivity';
        } else if (homaIR < 2.0) {
            risk = 'moderate';
            interpretation = 'Normal insulin sensitivity';
        } else {
            risk = 'high';
            interpretation = 'Insulin resistance present';
        }

        risks.push({ label: 'HOMA-IR', value: homaIR.toFixed(2), risk, interpretation });
    }

    // ApoB if available
    if (b.apoB) {
        let risk = 'low';
        let interpretation = '';

        if (b.apoB < 80) {
            interpretation = 'Optimal - low atherogenic particle count';
        } else if (b.apoB < 100) {
            risk = 'moderate';
            interpretation = 'Acceptable for most people';
        } else {
            risk = 'high';
            interpretation = 'Elevated atherogenic particles';
        }

        risks.push({ label: 'ApoB', value: `${b.apoB} mg/dL`, risk, interpretation });
    }

    // Lp(a) if available
    if (b.lpA) {
        let risk = 'low';
        let interpretation = '';

        if (b.lpA < 30) {
            interpretation = 'Low genetic cardiovascular risk';
        } else if (b.lpA < 50) {
            risk = 'moderate';
            interpretation = 'Moderate genetic risk factor';
        } else {
            risk = 'high';
            interpretation = 'Elevated genetic CV risk - discuss with doctor';
        }

        risks.push({ label: 'Lp(a)', value: `${b.lpA} nmol/L`, risk, interpretation });
    }

    if (risks.length === 0) {
        container.innerHTML = '<p class="no-data-message">Insufficient biomarkers for CV risk assessment</p>';
        return;
    }

    container.innerHTML = `
        <div class="cv-risk-list">
            ${risks.map(r => `
                <div class="cv-risk-item ${r.risk}">
                    <div class="cv-risk-content">
                        <div class="cv-risk-header">
                            <span class="cv-risk-label">${r.label}</span>
                            <span class="cv-risk-badge ${r.risk}">${r.risk.charAt(0).toUpperCase() + r.risk.slice(1)} Risk</span>
                        </div>
                        <div class="cv-risk-value">${r.value}</div>
                        <div class="cv-risk-interpretation">${r.interpretation}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Render longevity risk flags
function renderLongevityFlags() {
    const container = document.getElementById('longevityFlagsContainer');
    if (!container) return;

    const flags = [];
    const latestLab = labData.length > 0 ? labData[labData.length - 1] : null;
    const latestDexa = dexaData.length > 0 ? dexaData[dexaData.length - 1] : null;

    // Check various longevity markers
    if (latestLab) {
        const b = latestLab.biomarkers;

        // Glucose metabolism
        if (b.hba1c && b.hba1c >= 5.7) {
            flags.push({
                category: 'Glucose',
                flag: 'Elevated HbA1c',
                value: `${b.hba1c}%`,
                severity: b.hba1c >= 6.5 ? 'high' : 'moderate',
                recommendation: 'Focus on reducing carbohydrate intake, increasing fiber, and post-meal walks'
            });
        }

        // Inflammation
        if (b.crp && b.crp > 1) {
            flags.push({
                category: 'Inflammation',
                flag: 'Elevated hs-CRP',
                value: `${b.crp} mg/L`,
                severity: b.crp > 3 ? 'high' : 'moderate',
                recommendation: 'Consider anti-inflammatory diet, omega-3s, reduce processed foods'
            });
        }

        if (b.homocysteine && b.homocysteine > 10) {
            flags.push({
                category: 'Methylation',
                flag: 'Elevated Homocysteine',
                value: `${b.homocysteine} µmol/L`,
                severity: b.homocysteine > 15 ? 'high' : 'moderate',
                recommendation: 'Consider B vitamins (B12, folate, B6), may indicate methylation issues'
            });
        }

        // Vitamin D
        if (b.vitaminD && b.vitaminD < 40) {
            flags.push({
                category: 'Vitamins',
                flag: 'Suboptimal Vitamin D',
                value: `${b.vitaminD} ng/mL`,
                severity: b.vitaminD < 20 ? 'high' : 'moderate',
                recommendation: 'Supplement vitamin D3 with K2, target 40-60 ng/mL'
            });
        }

        // Liver enzymes
        if (b.alt && b.alt > 30) {
            flags.push({
                category: 'Liver',
                flag: 'Elevated ALT',
                value: `${b.alt} U/L`,
                severity: b.alt > 50 ? 'high' : 'moderate',
                recommendation: 'May indicate fatty liver - reduce sugar/alcohol, increase choline'
            });
        }

        // Uric acid
        if (b.uricAcid && b.uricAcid > 6) {
            flags.push({
                category: 'Metabolic',
                flag: 'Elevated Uric Acid',
                value: `${b.uricAcid} mg/dL`,
                severity: b.uricAcid > 7 ? 'high' : 'moderate',
                recommendation: 'Reduce fructose intake, limit alcohol, increase hydration'
            });
        }

        // Ferritin (both high and low)
        if (b.ferritin) {
            if (b.ferritin > 200) {
                flags.push({
                    category: 'Iron',
                    flag: 'Elevated Ferritin',
                    value: `${b.ferritin} ng/mL`,
                    severity: b.ferritin > 400 ? 'high' : 'moderate',
                    recommendation: 'Consider blood donation, check for hemochromatosis if very elevated'
                });
            } else if (b.ferritin < 30) {
                flags.push({
                    category: 'Iron',
                    flag: 'Low Ferritin',
                    value: `${b.ferritin} ng/mL`,
                    severity: b.ferritin < 15 ? 'high' : 'moderate',
                    recommendation: 'May need iron supplementation, check for absorption issues'
                });
            }
        }
    }

    // DEXA-based flags
    if (latestDexa) {
        if (latestDexa.bodyFatPercent > 30) {
            flags.push({
                category: 'Body Composition',
                flag: 'Elevated Body Fat',
                value: `${latestDexa.bodyFatPercent}%`,
                severity: latestDexa.bodyFatPercent > 35 ? 'high' : 'moderate',
                recommendation: 'Focus on strength training and caloric deficit with adequate protein'
            });
        }

        if (latestDexa.visceralFat && latestDexa.visceralFat > 100) {
            flags.push({
                category: 'Visceral Fat',
                flag: 'High Visceral Adipose Tissue',
                value: `${latestDexa.visceralFat}g`,
                severity: latestDexa.visceralFat > 150 ? 'high' : 'moderate',
                recommendation: 'Prioritize metabolic health - Zone 2 cardio, sleep, stress management'
            });
        }

        if (latestDexa.agRatio && latestDexa.agRatio > 1.0) {
            flags.push({
                category: 'Fat Distribution',
                flag: 'Elevated A/G Ratio',
                value: latestDexa.agRatio.toFixed(2),
                severity: latestDexa.agRatio > 1.2 ? 'high' : 'moderate',
                recommendation: 'Higher abdominal vs hip fat ratio - focus on core exercises, stress reduction, and quality sleep'
            });
        }
    }

    if (flags.length === 0) {
        container.innerHTML = '<div class="no-flags"><span class="flag-icon">✓</span><p>No significant longevity risk flags detected. Keep up the good work!</p></div>';
        return;
    }

    // Sort by severity
    flags.sort((a, b) => {
        const order = { high: 0, moderate: 1, low: 2 };
        return order[a.severity] - order[b.severity];
    });

    container.innerHTML = `
        <div class="longevity-flags-list">
            ${flags.map(f => `
                <div class="longevity-flag ${f.severity}">
                    <div class="flag-content">
                        <div class="flag-header">
                            <span class="flag-category">${f.category}</span>
                            <span class="flag-severity ${f.severity}">${f.severity}</span>
                        </div>
                        <div class="flag-title">${f.flag}: ${f.value}</div>
                        <div class="flag-recommendation">${f.recommendation}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Render CGM-Lab correlation insights
function renderCGMLabCorrelation() {
    const container = document.getElementById('cgmLabCorrelationContainer');
    if (!container) return;

    const latestLab = labData.length > 0 ? labData[labData.length - 1] : null;
    const latestDexa = dexaData.length > 0 ? dexaData[dexaData.length - 1] : null;

    // Get CGM metrics from current period
    const cgmMetrics = typeof currentPeriodData !== 'undefined' && currentPeriodData.length > 0
        ? calculateMetrics(currentPeriodData)
        : null;

    // Get weight data
    const hasWeightData = typeof weightData !== 'undefined' && weightData.length > 0;
    const weightChange = hasWeightData ? weightData[weightData.length - 1].weight - weightData[0].weight : null;

    // Need CGM data at minimum
    if (!cgmMetrics) {
        container.innerHTML = '<p class="no-data-message">Upload CGM data to see metabolic insights</p>';
        return;
    }

    const insights = [];
    const b = latestLab?.biomarkers || {};

    // === CGM + LAB CORRELATIONS ===

    // 1. CGM Average Glucose vs Lab HbA1c
    if (b.hba1c) {
        const estimatedA1c = (cgmMetrics.avgGlucose + 46.7) / 28.7;
        const diff = estimatedA1c - b.hba1c;
        let interpretation = '';
        let implication = '';

        if (Math.abs(diff) < 0.3) {
            interpretation = 'CGM and lab HbA1c are well aligned';
            implication = 'Your continuous glucose monitoring accurately reflects your long-term glycemic control. This consistency suggests stable glucose patterns across different times of day and activities.';
        } else if (diff > 0.3) {
            interpretation = 'CGM shows higher average than lab HbA1c';
            implication = 'Your CGM captures glucose elevations (likely post-meal spikes) that aren\'t fully reflected in HbA1c. This may indicate good overnight/fasting control but elevated daytime glucose. Focus on post-meal glucose management through meal timing and composition.';
        } else {
            interpretation = 'Lab HbA1c higher than CGM suggests';
            implication = 'Your glucose may be elevated during times you\'re not wearing CGM, or there may be individual variation in glycation rates. Consider extending CGM wear during different activities or times.';
        }

        insights.push({
            category: 'CGM & Lab Integration',
            title: 'Estimated A1c vs Lab HbA1c',
            value: `eA1c: ${estimatedA1c.toFixed(1)}% | Lab: ${b.hba1c}%`,
            status: Math.abs(diff) < 0.3 ? 'optimal' : Math.abs(diff) < 0.5 ? 'normal' : 'elevated',
            interpretation,
            implication,
            evidence: 'GMI (glucose management indicator) from CGM correlates r=0.95 with lab HbA1c (Bergenstal et al., Diabetes Care 2018)'
        });
    }

    // 2. CGM Fasting vs Lab Fasting Glucose
    if (cgmMetrics.fasting && b.glucose) {
        const diff = cgmMetrics.fasting - b.glucose;
        let interpretation = '';
        let implication = '';

        if (Math.abs(diff) < 8) {
            interpretation = 'CGM and lab fasting glucose align well';
            implication = 'Your early morning glucose (4-7am CGM average) matches your lab fasting value, confirming consistent overnight glucose regulation.';
        } else if (diff > 8) {
            interpretation = 'CGM fasting runs higher than lab';
            implication = 'Your CGM captures dawn phenomenon (natural morning glucose rise) that single-point lab tests may miss. This is common and can be managed with evening meal timing adjustments.';
        } else {
            interpretation = 'Lab fasting higher than CGM average';
            implication = 'Lab conditions (stress, timing) may have elevated your reading. CGM provides a more representative fasting average over multiple days.';
        }

        insights.push({
            category: 'CGM & Lab Integration',
            title: 'Fasting Glucose Comparison',
            value: `CGM: ${cgmMetrics.fasting.toFixed(0)} | Lab: ${b.glucose} mg/dL`,
            status: Math.abs(diff) < 8 ? 'optimal' : 'normal',
            interpretation,
            implication,
            evidence: 'Dawn phenomenon affects 50%+ of individuals; CGM captures this better than single fasting tests (Monnier et al., Diabetes Care 2013)'
        });
    }

    // 3. Glucose Variability (CV) and Insulin Sensitivity
    if (b.triglycerides && b.hdl) {
        const tgHdl = b.triglycerides / b.hdl;
        let interpretation = '';
        let implication = '';

        // CV < 20% is low variability, 20-33% moderate, >33% high
        const cvStatus = cgmMetrics.cv < 20 ? 'low' : cgmMetrics.cv < 33 ? 'moderate' : 'high';
        const tgHdlStatus = tgHdl < 1.5 ? 'optimal' : tgHdl < 2.5 ? 'moderate' : 'elevated';

        if (cvStatus === 'low' && tgHdlStatus === 'optimal') {
            interpretation = 'Excellent metabolic flexibility confirmed';
            implication = 'Your low glucose variability combined with optimal TG/HDL ratio indicates your cells efficiently switch between burning glucose and fat. This metabolic flexibility is associated with easier weight management, stable energy, and longevity. Your body handles fuel sources well.';
        } else if (cvStatus !== 'low' && tgHdlStatus === 'optimal') {
            interpretation = 'Good lipids but glucose variability suggests optimization opportunity';
            implication = 'Despite good lipid markers, your glucose swings suggest room to improve carbohydrate tolerance. Consider meal sequencing (vegetables/protein before carbs), adding fiber, or reducing refined carbohydrates. Your lipids suggest capacity for improvement.';
        } else if (cvStatus === 'low' && tgHdlStatus !== 'optimal') {
            interpretation = 'Stable glucose but lipids suggest metabolic stress';
            implication = 'Your steady glucose is positive, but lipid pattern suggests underlying insulin resistance not yet manifesting in glucose. This is an early warning sign - focus on reducing refined carbs and increasing aerobic exercise to prevent glucose dysregulation.';
        } else {
            interpretation = 'Both markers indicate metabolic inflexibility';
            implication = 'Elevated glucose variability combined with TG/HDL pattern suggests insulin resistance affecting both glucose and fat metabolism. Evidence-based interventions: time-restricted eating (12-16hr overnight fast), Zone 2 cardio (150+ min/week), strength training, and prioritizing protein/fiber at meals.';
        }

        insights.push({
            category: 'Metabolic Flexibility',
            title: 'Glucose Variability + Lipid Pattern',
            value: `CV: ${cgmMetrics.cv.toFixed(1)}% | TG/HDL: ${tgHdl.toFixed(2)}`,
            status: (cvStatus === 'low' && tgHdlStatus === 'optimal') ? 'optimal' :
                   (cvStatus === 'moderate' || tgHdlStatus === 'moderate') ? 'normal' : 'elevated',
            interpretation,
            implication,
            evidence: 'Glucose variability (CV) independently predicts cardiovascular events; TG/HDL correlates with insulin resistance and small dense LDL (Monnier et al., JAMA 2006; McLaughlin et al., Circulation 2005)'
        });
    }

    // 4. Glucose Variability and Inflammation
    if (b.crp) {
        let interpretation = '';
        let implication = '';

        const cvStatus = cgmMetrics.cv < 20 ? 'low' : cgmMetrics.cv < 33 ? 'moderate' : 'high';
        const crpStatus = b.crp < 0.5 ? 'optimal' : b.crp < 1.0 ? 'low' : b.crp < 3.0 ? 'moderate' : 'high';

        if (cvStatus === 'low' && crpStatus === 'optimal') {
            interpretation = 'Low oxidative stress profile';
            implication = 'Your stable glucose patterns combined with low inflammation create an optimal environment for cellular health and longevity. Glucose swings trigger oxidative stress and inflammation - you\'re avoiding this cycle.';
        } else if (cvStatus !== 'low' && crpStatus !== 'optimal') {
            interpretation = 'Glucose variability may be driving inflammation';
            implication = 'Research shows glucose spikes generate reactive oxygen species and inflammatory cytokines. Your CRP elevation may be partially explained by glycemic variability. Reducing glucose swings through fiber, protein-first eating, and post-meal walks could lower inflammation.';
        } else if (cvStatus !== 'low' && crpStatus === 'optimal') {
            interpretation = 'Glucose variability not yet affecting inflammation';
            implication = 'Your low CRP despite glucose swings suggests other protective factors (diet, exercise, sleep) are buffering inflammatory effects. Continue those habits while working to reduce glucose variability for long-term protection.';
        } else {
            interpretation = 'Inflammation present with stable glucose';
            implication = 'Your inflammation likely has other drivers (visceral fat, sleep, stress, diet quality) since glucose is well-controlled. Investigate other inflammatory sources.';
        }

        insights.push({
            category: 'Inflammation & Oxidative Stress',
            title: 'Glucose Swings + Inflammation',
            value: `CV: ${cgmMetrics.cv.toFixed(1)}% | CRP: ${b.crp} mg/L`,
            status: (cvStatus === 'low' && crpStatus === 'optimal') ? 'optimal' :
                   (crpStatus !== 'optimal' || cvStatus === 'high') ? 'elevated' : 'normal',
            interpretation,
            implication,
            evidence: 'Glycemic variability independently activates oxidative stress and inflammatory pathways (Ceriello et al., Diabetes Care 2008; Monnier et al., JAMA 2006)'
        });
    }

    // === CGM + DEXA CORRELATIONS ===
    if (latestDexa) {
        // 5. Time in Range and Visceral Fat
        if (latestDexa.visceralFat !== null && latestDexa.visceralFat !== undefined) {
            let interpretation = '';
            let implication = '';

            const tirStatus = cgmMetrics.tirOptimal >= 70 ? 'excellent' : cgmMetrics.tirOptimal >= 50 ? 'good' : 'needs_work';
            const vfStatus = latestDexa.visceralFat < 52 ? 'optimal' : latestDexa.visceralFat < 100 ? 'moderate' : 'elevated';

            if (tirStatus === 'excellent' && vfStatus === 'optimal') {
                interpretation = 'Optimal glucose control supports low visceral fat';
                implication = 'Your excellent time in range (70-110 mg/dL) combined with low visceral fat creates a virtuous cycle: stable glucose reduces insulin spikes that promote visceral fat storage, while low visceral fat improves insulin sensitivity. Maintain this through continued lifestyle habits.';
            } else if (tirStatus !== 'excellent' && vfStatus !== 'optimal') {
                interpretation = 'Glucose dysregulation and visceral fat may be reinforcing each other';
                implication = 'Visceral fat secretes inflammatory cytokines that worsen insulin resistance, causing glucose spikes. Glucose spikes trigger insulin surges that promote fat storage (especially visceral). Breaking this cycle requires targeting both: Zone 2 cardio preferentially burns visceral fat while improving glucose uptake.';
            } else if (tirStatus === 'excellent' && vfStatus !== 'optimal') {
                interpretation = 'Good glucose control despite visceral fat';
                implication = 'Your body is maintaining glucose control despite visceral fat - this is protective. However, reducing visceral fat will further improve insulin sensitivity and lower disease risk. Focus on caloric deficit with adequate protein to preserve muscle.';
            } else {
                interpretation = 'Glucose patterns need attention despite healthy visceral fat';
                implication = 'Your low visceral fat is excellent, but glucose patterns suggest dietary or lifestyle factors affecting glycemic control. Focus on meal composition and timing rather than caloric restriction.';
            }

            insights.push({
                category: 'Body Composition & Glucose',
                title: 'Time in Range + Visceral Fat',
                value: `TIR: ${cgmMetrics.tirOptimal.toFixed(0)}% | VAT: ${latestDexa.visceralFat.toFixed(0)} in³`,
                status: (tirStatus === 'excellent' && vfStatus === 'optimal') ? 'optimal' :
                       (tirStatus === 'needs_work' || vfStatus === 'elevated') ? 'elevated' : 'normal',
                interpretation,
                implication,
                evidence: 'Visceral adipose tissue is the strongest body composition predictor of glucose dysregulation; hyperinsulinemia promotes visceral fat accumulation (Després, Nature 2006; Smith et al., JCI 2019)'
            });
        }

        // 6. Body Fat % and Glucose Metrics
        if (latestDexa.bodyFatPercent !== null) {
            let interpretation = '';
            let implication = '';

            const bfStatus = latestDexa.bodyFatPercent < 20 ? 'lean' : latestDexa.bodyFatPercent < 25 ? 'healthy' : latestDexa.bodyFatPercent < 30 ? 'elevated' : 'high';
            const avgGStatus = cgmMetrics.avgGlucose < 90 ? 'excellent' : cgmMetrics.avgGlucose < 100 ? 'good' : 'elevated';

            if (bfStatus === 'lean' && avgGStatus === 'excellent') {
                interpretation = 'Lean body composition supports optimal glucose';
                implication = 'Your low body fat percentage contributes to excellent insulin sensitivity, reflected in your average glucose. This body composition is associated with longevity and low chronic disease risk. Focus on maintaining muscle mass as you age.';
            } else if (avgGStatus === 'excellent' && (bfStatus === 'elevated' || bfStatus === 'high')) {
                interpretation = 'Metabolically healthy despite elevated body fat';
                implication = 'Your glucose control is excellent despite higher body fat - you may be "metabolically healthy obese." However, research shows this state often progresses to metabolic dysfunction over time. Use this window to reduce body fat while metabolic health is good.';
            } else {
                interpretation = 'Body fat and glucose suggest insulin resistance';
                implication = 'Elevated body fat combined with average glucose above optimal suggests developing insulin resistance. Each 5% reduction in body fat significantly improves insulin sensitivity. Prioritize resistance training to preserve/build muscle while losing fat.';
            }

            insights.push({
                category: 'Body Composition & Glucose',
                title: 'Body Fat % + Average Glucose',
                value: `BF: ${latestDexa.bodyFatPercent.toFixed(1)}% | Avg: ${cgmMetrics.avgGlucose.toFixed(0)} mg/dL`,
                status: (avgGStatus === 'excellent' && (bfStatus === 'lean' || bfStatus === 'healthy')) ? 'optimal' :
                       avgGStatus === 'excellent' ? 'normal' : 'elevated',
                interpretation,
                implication,
                evidence: 'Metabolically healthy obesity often transitions to metabolic syndrome; 5-10% weight loss improves insulin sensitivity 30-50% (Stefan et al., Lancet Diabetes 2017)'
            });
        }
    }

    // === WEIGHT TRENDS + GLUCOSE ===
    if (hasWeightData && weightChange !== null) {
        let interpretation = '';
        let implication = '';

        const weightTrend = weightChange < -2 ? 'losing' : weightChange > 2 ? 'gaining' : 'stable';
        const tirTrend = cgmMetrics.tirOptimal >= 70 ? 'excellent' : cgmMetrics.tirOptimal >= 50 ? 'good' : 'needs_work';

        if (weightTrend === 'losing' && tirTrend === 'excellent') {
            interpretation = 'Weight loss + excellent glucose: optimal progress';
            implication = 'Your weight loss is accompanied by excellent glucose control - this indicates you\'re losing fat while preserving metabolic health. This pattern predicts sustained weight loss success and improved long-term outcomes.';
        } else if (weightTrend === 'losing' && tirTrend !== 'excellent') {
            interpretation = 'Weight loss with suboptimal glucose patterns';
            implication = 'While losing weight, your glucose patterns suggest room for improvement. This may indicate losing muscle along with fat, or dietary choices that spike glucose despite caloric deficit. Ensure adequate protein (0.7-1g per lb bodyweight) and consider meal composition.';
        } else if (weightTrend === 'stable' && tirTrend === 'excellent') {
            interpretation = 'Stable weight with metabolic health';
            implication = 'If weight loss is your goal, you may need to increase caloric deficit. However, your excellent glucose control means any deficit should preserve metabolic health. Consider increasing activity rather than drastically cutting calories.';
        } else if (weightTrend === 'gaining') {
            interpretation = 'Weight gain detected';
            implication = weightChange > 5
                ? 'Significant weight gain can worsen glucose control over time. Reassess caloric intake and activity levels.'
                : 'Minor weight fluctuation is normal. Monitor trends over weeks rather than days.';
        } else {
            interpretation = 'Stable weight but glucose needs attention';
            implication = 'Even at stable weight, improving glucose patterns through food choices and timing can improve body composition (less visceral fat) and metabolic health without scale changes.';
        }

        insights.push({
            category: 'Weight Progress & Glucose',
            title: 'Weight Trend + Time in Range',
            value: `Weight: ${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} lbs | TIR: ${cgmMetrics.tirOptimal.toFixed(0)}%`,
            status: (weightTrend === 'losing' && tirTrend === 'excellent') ? 'optimal' :
                   (weightTrend === 'gaining') ? 'elevated' : 'normal',
            interpretation,
            implication,
            evidence: 'Weight loss with preserved TIR indicates fat loss; declining TIR during weight loss may indicate muscle loss or metabolic adaptation (Hall et al., Cell Metabolism 2016)'
        });
    }

    // === LONGEVITY SYNTHESIS ===
    // Only add if we have multiple data sources
    if (latestLab && (latestDexa || cgmMetrics)) {
        let riskFactors = 0;
        let protectiveFactors = 0;
        let keyFindings = [];

        // Assess each factor
        if (cgmMetrics.cv < 20) { protectiveFactors++; keyFindings.push('low glucose variability'); }
        else if (cgmMetrics.cv > 33) { riskFactors++; keyFindings.push('high glucose variability'); }

        if (b.crp && b.crp < 1) { protectiveFactors++; keyFindings.push('low inflammation'); }
        else if (b.crp && b.crp > 3) { riskFactors++; keyFindings.push('elevated inflammation'); }

        if (b.apoB && b.apoB < 70) { protectiveFactors++; keyFindings.push('optimal ApoB'); }
        else if (b.apoB && b.apoB > 100) { riskFactors++; keyFindings.push('elevated ApoB'); }

        if (latestDexa?.visceralFat && latestDexa.visceralFat < 52) { protectiveFactors++; keyFindings.push('low visceral fat'); }
        else if (latestDexa?.visceralFat && latestDexa.visceralFat > 100) { riskFactors++; keyFindings.push('elevated visceral fat'); }

        if (b.glucose && b.insulin) {
            const homaIR = (b.glucose * b.insulin) / 405;
            if (homaIR < 1) { protectiveFactors++; keyFindings.push('excellent insulin sensitivity'); }
            else if (homaIR > 2) { riskFactors++; keyFindings.push('insulin resistance'); }
        }

        let interpretation = '';
        let implication = '';

        if (protectiveFactors >= 3 && riskFactors === 0) {
            interpretation = 'Strong longevity profile';
            implication = `Your combined markers (${keyFindings.slice(0, 3).join(', ')}) are associated with healthy aging and extended healthspan. Continue current lifestyle habits. Consider optimizing sleep, stress management, and social connections for maximum longevity benefit.`;
        } else if (riskFactors >= 2) {
            interpretation = 'Multiple areas need attention for longevity';
            implication = `Key areas to address: ${keyFindings.filter(f => f.includes('elevated') || f.includes('resistance') || f.includes('high')).join(', ')}. These factors compound over time. The good news: they\'re all modifiable through lifestyle interventions. Prioritize the factor most connected to your daily habits.`;
        } else {
            interpretation = 'Mixed longevity markers';
            implication = `You have protective factors (${keyFindings.filter(f => !f.includes('elevated')).slice(0, 2).join(', ')}) and areas for improvement. Focus on maintaining what's working while addressing weaker areas. Small consistent improvements compound significantly over decades.`;
        }

        insights.push({
            category: 'Longevity Summary',
            title: 'Combined Risk Assessment',
            value: `${protectiveFactors} protective | ${riskFactors} risk factors`,
            status: protectiveFactors >= 3 && riskFactors === 0 ? 'optimal' :
                   riskFactors >= 2 ? 'elevated' : 'normal',
            interpretation,
            implication,
            evidence: 'Metabolic syndrome criteria (≥3 factors) increases CVD mortality 2-3x; each factor addressed reduces risk substantially (Grundy et al., Circulation 2005)'
        });
    }

    if (insights.length === 0) {
        container.innerHTML = '<p class="no-data-message">Upload lab or DEXA data to see correlations with your CGM patterns</p>';
        return;
    }

    // Group insights by category
    const categories = {};
    insights.forEach(i => {
        if (!categories[i.category]) categories[i.category] = [];
        categories[i.category].push(i);
    });

    container.innerHTML = `
        <div class="insights-container">
            ${Object.entries(categories).map(([category, categoryInsights]) => `
                <div class="insight-category">
                    <h4 class="category-title">${category}</h4>
                    <div class="insights-list">
                        ${categoryInsights.map(insight => `
                            <div class="insight-card ${insight.status}">
                                <div class="insight-header">
                                    <span class="insight-title">${insight.title}</span>
                                    <span class="insight-value">${insight.value}</span>
                                </div>
                                <div class="insight-interpretation">${insight.interpretation}</div>
                                <div class="insight-implication">${insight.implication}</div>
                                <div class="insight-evidence">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                                        <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                                    </svg>
                                    ${insight.evidence}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Generate comprehensive PDF report
async function generateComprehensiveReport() {
    showNotification('Generating comprehensive report...', 'info');

    // Get CGM metrics if available
    const hasCGMData = typeof currentPeriodData !== 'undefined' && currentPeriodData.length > 0;
    const cgmMetrics = hasCGMData ? calculateMetrics(currentPeriodData) : null;

    // Get weight data
    const hasWeightData = typeof weightData !== 'undefined' && weightData.length > 0;
    const weightChange = hasWeightData ? (weightData[weightData.length - 1].weight - weightData[0].weight).toFixed(1) : null;

    // Get latest data
    const latestLab = labData.length > 0 ? labData[labData.length - 1] : null;
    const latestDexa = dexaData.length > 0 ? dexaData[dexaData.length - 1] : null;

    // Helper to build a metric row
    const metricRow = (label, value, unit = '', bgColor = '#ffffff') => `
        <tr style="background-color: ${bgColor};">
            <td style="padding: 10px; border: 1px solid #e2e8f0; color: #2d3748;"><strong>${label}</strong></td>
            <td style="padding: 10px; border: 1px solid #e2e8f0; color: #1a202c;">${value}${unit ? ' ' + unit : ''}</td>
        </tr>
    `;

    // Build CGM Section
    let cgmSection = '';
    if (cgmMetrics) {
        const eA1c = ((cgmMetrics.avgGlucose + 46.7) / 28.7).toFixed(1);
        cgmSection = `
            <div style="margin-bottom: 25px; background-color: #ffffff;">
                <h2 style="color: #1a365d; border-bottom: 2px solid #3182ce; padding-bottom: 8px; font-size: 16px; margin: 0 0 12px 0;">CGM Analysis</h2>
                <table style="width: 100%; border-collapse: collapse; background-color: #ffffff;">
                    ${metricRow('Average Glucose', cgmMetrics.avgGlucose?.toFixed(0) || 'N/A', 'mg/dL', '#f7fafc')}
                    ${metricRow('Estimated A1c', eA1c, '%')}
                    ${metricRow('Glucose Variability (CV)', cgmMetrics.cv?.toFixed(1) || 'N/A', '%', '#f7fafc')}
                    ${metricRow('Time in Range (70-110)', cgmMetrics.tirOptimal?.toFixed(0) || 'N/A', '%')}
                    ${metricRow('Fasting Glucose', cgmMetrics.fasting ? cgmMetrics.fasting.toFixed(0) : 'N/A', cgmMetrics.fasting ? 'mg/dL' : '', '#f7fafc')}
                    ${metricRow('Time Below 70', cgmMetrics.tirLow?.toFixed(1) || '0.0', '%')}
                </table>
                ${hasWeightData ? `<p style="margin-top: 12px; color: #4a5568; font-size: 13px;"><strong>Weight Change:</strong> ${weightChange > 0 ? '+' : ''}${weightChange} lbs</p>` : ''}
            </div>
        `;
    }

    // Build DEXA Section
    let dexaSection = '';
    if (latestDexa) {
        dexaSection = `
            <div style="margin-bottom: 25px; background-color: #ffffff;">
                <h2 style="color: #1a365d; border-bottom: 2px solid #48bb78; padding-bottom: 8px; font-size: 16px; margin: 0 0 12px 0;">Body Composition (DEXA)</h2>
                <table style="width: 100%; border-collapse: collapse; background-color: #ffffff;">
                    ${metricRow('Body Fat', latestDexa.bodyFatPercent?.toFixed(1) || 'N/A', '%', '#f7fafc')}
                    ${metricRow('Lean Mass', latestDexa.leanMass?.toFixed(1) || 'N/A', 'lbs')}
                    ${metricRow('Fat Mass', latestDexa.fatMass?.toFixed(1) || 'N/A', 'lbs', '#f7fafc')}
                    ${latestDexa.visceralFat ? metricRow('Visceral Fat', latestDexa.visceralFat.toFixed(1), 'cu in') : ''}
                    ${latestDexa.agRatio ? metricRow('A/G Ratio', latestDexa.agRatio.toFixed(2), '', '#f7fafc') : ''}
                </table>
            </div>
        `;
    }

    // Build Lab Section
    let labSection = '';
    if (latestLab && latestLab.biomarkers) {
        const b = latestLab.biomarkers;
        const labRows = [];
        if (b.glucose) labRows.push(metricRow('Glucose', b.glucose, 'mg/dL', '#f7fafc'));
        if (b.hba1c) labRows.push(metricRow('HbA1c', b.hba1c, '%'));
        if (b.insulin) labRows.push(metricRow('Insulin', b.insulin, 'uIU/mL', '#f7fafc'));
        if (b.triglycerides) labRows.push(metricRow('Triglycerides', b.triglycerides, 'mg/dL'));
        if (b.hdl) labRows.push(metricRow('HDL', b.hdl, 'mg/dL', '#f7fafc'));
        if (b.ldl) labRows.push(metricRow('LDL', b.ldl, 'mg/dL'));
        if (b.totalCholesterol) labRows.push(metricRow('Total Cholesterol', b.totalCholesterol, 'mg/dL', '#f7fafc'));
        if (b.crp) labRows.push(metricRow('CRP (hs)', b.crp, 'mg/L'));
        if (b.apoB) labRows.push(metricRow('ApoB', b.apoB, 'mg/dL', '#f7fafc'));
        if (b.tsh) labRows.push(metricRow('TSH', b.tsh, 'mIU/L'));

        if (labRows.length > 0) {
            labSection = `
                <div style="margin-bottom: 25px; background-color: #ffffff;">
                    <h2 style="color: #1a365d; border-bottom: 2px solid #ed8936; padding-bottom: 8px; font-size: 16px; margin: 0 0 12px 0;">Laboratory Results</h2>
                    <table style="width: 100%; border-collapse: collapse; background-color: #ffffff;">
                        ${labRows.join('')}
                    </table>
                </div>
            `;
        }
    }

    // Build Risk Assessment Section
    let riskSection = '';
    const risks = [];
    if (latestLab?.biomarkers) {
        const b = latestLab.biomarkers;
        if (b.triglycerides && b.hdl) {
            const tgHdl = b.triglycerides / b.hdl;
            const tgHdlStatus = tgHdl < 1.5 ? 'Optimal' : tgHdl < 2.5 ? 'Normal' : tgHdl < 3.5 ? 'Elevated' : 'High';
            risks.push(metricRow('TG/HDL Ratio', tgHdl.toFixed(2) + ' (' + tgHdlStatus + ')', '', '#f7fafc'));
        }
        if (b.glucose && b.insulin) {
            const homaIR = (b.glucose * b.insulin) / 405;
            const homaStatus = homaIR < 1.0 ? 'Optimal' : homaIR < 1.9 ? 'Normal' : homaIR < 2.9 ? 'Elevated' : 'High';
            risks.push(metricRow('HOMA-IR', homaIR.toFixed(2) + ' (' + homaStatus + ')', ''));
        }
        if (b.crp) {
            const crpStatus = b.crp < 1.0 ? 'Low Risk' : b.crp < 3.0 ? 'Moderate Risk' : 'High Risk';
            risks.push(metricRow('Inflammation (CRP)', b.crp + ' mg/L (' + crpStatus + ')', '', '#f7fafc'));
        }
    }
    if (risks.length > 0) {
        riskSection = `
            <div style="margin-bottom: 25px; background-color: #ffffff;">
                <h2 style="color: #1a365d; border-bottom: 2px solid #e53e3e; padding-bottom: 8px; font-size: 16px; margin: 0 0 12px 0;">Risk Assessment</h2>
                <table style="width: 100%; border-collapse: collapse; background-color: #ffffff;">
                    ${risks.join('')}
                </table>
            </div>
        `;
    }

    // Create the report HTML - NO centering, content starts at left edge
    const reportHTML = `
        <div style="font-family: Arial, Helvetica, sans-serif; padding: 30px; width: 700px; background-color: #ffffff; color: #1a202c; position: absolute; left: 0; top: 0;">
            <div style="text-align: center; border-bottom: 3px solid #1a365d; padding-bottom: 15px; margin-bottom: 25px; background-color: #ffffff;">
                <h1 style="color: #1a365d; margin: 0 0 8px 0; font-size: 24px;">Comprehensive Health Report</h1>
                <p style="color: #718096; margin: 0; font-size: 12px;">Generated: ${new Date().toLocaleDateString()}</p>
            </div>
            ${cgmSection}
            ${dexaSection}
            ${labSection}
            ${riskSection}
            <div style="margin-top: 30px; padding-top: 15px; border-top: 2px solid #e2e8f0; text-align: center; color: #a0aec0; font-size: 10px; background-color: #ffffff;">
                <p style="margin: 0 0 4px 0;"><em>This report is for informational purposes only.</em></p>
                <p style="margin: 0;">Signos Physician Portal (Unofficial)</p>
            </div>
        </div>
    `;

    // Create container - position relative so child absolute positioning works
    const reportContainer = document.createElement('div');
    reportContainer.id = 'pdf-report-container';
    reportContainer.style.cssText = 'position: fixed; top: 0; left: 0; width: 800px; height: auto; background-color: #ffffff; z-index: 99999; overflow: visible;';
    reportContainer.innerHTML = reportHTML;

    document.body.appendChild(reportContainer);

    // Wait for render
    await new Promise(resolve => setTimeout(resolve, 200));

    // Generate PDF
    const opt = {
        margin: 10,
        filename: `health-report-${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff'
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
        await html2pdf().set(opt).from(reportContainer.firstElementChild).save();
        showNotification('Report generated successfully!', 'success');
    } catch (error) {
        console.error('PDF generation error:', error);
        showNotification('Error generating report: ' + error.message, 'error');
    } finally {
        document.body.removeChild(reportContainer);
    }
}

