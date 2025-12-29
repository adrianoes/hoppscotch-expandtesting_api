const fs = require('fs');
const path = require('path');
const { parseString } = require('xml2js');

// Paths
const xmlPath = path.join(__dirname, 'reports', 'report.xml');
const htmlPath = path.join(__dirname, 'reports', 'report.html');

// Read XML file
fs.readFile(xmlPath, 'utf-8', (err, xmlData) => {
    if (err) {
        console.error('Error reading XML file:', err);
        process.exit(1);
    }

    // Parse XML
    parseString(xmlData, (err, result) => {
        if (err) {
            console.error('Error parsing XML:', err);
            process.exit(1);
        }

        // Generate HTML
        const html = generateHTML(result);

        // Write HTML file
        fs.writeFile(htmlPath, html, 'utf-8', (err) => {
            if (err) {
                console.error('Error writing HTML file:', err);
                process.exit(1);
            }
            console.log('✓ HTML report generated successfully at:', htmlPath);
        });
    });
});

function generateHTML(data) {
    const testsuites = data.testsuites;
    const totalTests = parseInt(testsuites.$.tests);
    const totalFailures = parseInt(testsuites.$.failures);
    const totalErrors = parseInt(testsuites.$.errors);
    const totalTime = parseFloat(testsuites.$.time).toFixed(2);
    const totalPassed = totalTests - totalFailures - totalErrors;
    const successRate = ((totalPassed / totalTests) * 100).toFixed(1);
    
    const suites = testsuites.testsuite || [];
    const timestamp = suites.length > 0 ? new Date(suites[0].$.timestamp).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR');

    let suitesHTML = '';
    suites.forEach((suite, index) => {
        const suiteName = suite.$.name;
        const suiteTests = parseInt(suite.$.tests);
        const suiteFailures = parseInt(suite.$.failures);
        const suiteErrors = parseInt(suite.$.errors);
        const suiteTime = parseFloat(suite.$.time).toFixed(3);
        const suitePassed = suiteTests - suiteFailures - suiteErrors;
        const suiteStatus = (suiteFailures === 0 && suiteErrors === 0) ? 'passed' : 'failed';

        let testcasesHTML = '';
        if (suite.testcase) {
            suite.testcase.forEach(test => {
                const testName = test.$.name;
                const hasFailure = test.failure && test.failure.length > 0;
                const hasError = test.error && test.error.length > 0;
                const testStatus = hasFailure || hasError ? 'failed' : 'passed';
                const statusIcon = testStatus === 'passed' ? '✓' : '✗';

                let errorDetails = '';
                if (hasFailure) {
                    errorDetails = `<div class="error-message">${test.failure[0]._}</div>`;
                }
                if (hasError) {
                    errorDetails = `<div class="error-message">${test.error[0]._}</div>`;
                }

                testcasesHTML += `
                    <div class="testcase ${testStatus}">
                        <span class="status-icon">${statusIcon}</span>
                        <span class="testcase-name">${testName}</span>
                        ${errorDetails}
                    </div>
                `;
            });
        }

        suitesHTML += `
            <div class="suite ${suiteStatus}">
                <div class="suite-header" onclick="toggleSuite(${index})">
                    <div class="suite-title">
                        <span class="suite-status ${suiteStatus}"></span>
                        <span class="suite-name">${suiteName}</span>
                    </div>
                    <div class="suite-stats">
                        <span class="stat-badge passed">${suitePassed} passed</span>
                        ${suiteFailures > 0 ? `<span class="stat-badge failed">${suiteFailures} failed</span>` : ''}
                        ${suiteErrors > 0 ? `<span class="stat-badge error">${suiteErrors} errors</span>` : ''}
                        <span class="stat-time">${suiteTime}s</span>
                        <span class="expand-icon" id="icon-${index}">▼</span>
                    </div>
                </div>
                <div class="suite-body" id="suite-${index}">
                    ${testcasesHTML}
                </div>
            </div>
        `;
    });

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Report - Hoppscotch API Tests</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
        }

        .header {
            background: white;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 20px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .header h1 {
            color: #2d3748;
            font-size: 28px;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .header h1::before {
            content: '📊';
            font-size: 32px;
        }

        .header .subtitle {
            color: #718096;
            font-size: 14px;
            margin-bottom: 20px;
        }

        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }

        .summary-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }

        .summary-card.success {
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
        }

        .summary-card.failure {
            background: linear-gradient(135deg, #ee0979 0%, #ff6a00 100%);
        }

        .summary-card.time {
            background: linear-gradient(135deg, #4e54c8 0%, #8f94fb 100%);
        }

        .summary-card .value {
            font-size: 36px;
            font-weight: bold;
            margin-bottom: 5px;
        }

        .summary-card .label {
            font-size: 14px;
            opacity: 0.9;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .success-rate {
            margin-top: 20px;
            text-align: center;
        }

        .success-rate .percentage {
            font-size: 48px;
            font-weight: bold;
            color: ${successRate >= 90 ? '#38ef7d' : successRate >= 70 ? '#ffd700' : '#ff6a00'};
        }

        .success-rate .label {
            color: #718096;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .suites-container {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .suite {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            margin-bottom: 15px;
            overflow: hidden;
            transition: all 0.3s ease;
        }

        .suite:hover {
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .suite-header {
            padding: 15px 20px;
            background: #f7fafc;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: background 0.2s ease;
        }

        .suite-header:hover {
            background: #edf2f7;
        }

        .suite.passed .suite-header {
            border-left: 4px solid #38ef7d;
        }

        .suite.failed .suite-header {
            border-left: 4px solid #ff6a00;
        }

        .suite-title {
            display: flex;
            align-items: center;
            gap: 10px;
            flex: 1;
        }

        .suite-status {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            display: inline-block;
        }

        .suite-status.passed {
            background: #38ef7d;
        }

        .suite-status.failed {
            background: #ff6a00;
        }

        .suite-name {
            color: #2d3748;
            font-weight: 500;
            font-size: 14px;
        }

        .suite-stats {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .stat-badge {
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
        }

        .stat-badge.passed {
            background: #c6f6d5;
            color: #22543d;
        }

        .stat-badge.failed {
            background: #fed7d7;
            color: #742a2a;
        }

        .stat-badge.error {
            background: #feebc8;
            color: #7c2d12;
        }

        .stat-time {
            color: #718096;
            font-size: 12px;
        }

        .expand-icon {
            color: #718096;
            font-size: 12px;
            transition: transform 0.3s ease;
        }

        .expand-icon.expanded {
            transform: rotate(-180deg);
        }

        .suite-body {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease;
            background: white;
        }

        .suite-body.expanded {
            max-height: 5000px;
            padding: 15px 20px;
        }

        .testcase {
            padding: 10px 15px;
            margin-bottom: 8px;
            border-radius: 6px;
            display: flex;
            align-items: flex-start;
            gap: 10px;
            background: #f7fafc;
        }

        .testcase.passed {
            border-left: 3px solid #38ef7d;
        }

        .testcase.failed {
            border-left: 3px solid #ff6a00;
            background: #fff5f5;
        }

        .status-icon {
            font-weight: bold;
            font-size: 16px;
        }

        .testcase.passed .status-icon {
            color: #38ef7d;
        }

        .testcase.failed .status-icon {
            color: #ff6a00;
        }

        .testcase-name {
            flex: 1;
            color: #2d3748;
            font-size: 13px;
            line-height: 1.5;
        }

        .error-message {
            margin-top: 8px;
            padding: 10px;
            background: #fed7d7;
            border-radius: 4px;
            color: #742a2a;
            font-size: 12px;
            font-family: 'Courier New', monospace;
            width: 100%;
        }

        .footer {
            text-align: center;
            color: white;
            margin-top: 20px;
            font-size: 12px;
            opacity: 0.8;
        }

        @media print {
            body {
                background: white;
            }
            .suite-body {
                max-height: none !important;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Hoppscotch API Test Report</h1>
            <div class="subtitle">expandtesting Notes API · ${timestamp}</div>
            
            <div class="summary">
                <div class="summary-card">
                    <div class="value">${totalTests}</div>
                    <div class="label">Total Tests</div>
                </div>
                <div class="summary-card success">
                    <div class="value">${totalPassed}</div>
                    <div class="label">Passed</div>
                </div>
                ${totalFailures > 0 ? `
                <div class="summary-card failure">
                    <div class="value">${totalFailures}</div>
                    <div class="label">Failed</div>
                </div>
                ` : ''}
                <div class="summary-card time">
                    <div class="value">${totalTime}s</div>
                    <div class="label">Duration</div>
                </div>
            </div>

            <div class="success-rate">
                <div class="percentage">${successRate}%</div>
                <div class="label">Success Rate</div>
            </div>
        </div>

        <div class="suites-container">
            ${suitesHTML}
        </div>

        <div class="footer">
            Generated on ${new Date().toLocaleString('pt-BR')} · Hoppscotch CLI Test Report
        </div>
    </div>

    <script>
        function toggleSuite(index) {
            const body = document.getElementById('suite-' + index);
            const icon = document.getElementById('icon-' + index);
            
            if (body.classList.contains('expanded')) {
                body.classList.remove('expanded');
                icon.classList.remove('expanded');
            } else {
                body.classList.add('expanded');
                icon.classList.add('expanded');
            }
        }

        // Expand all suites on load
        window.addEventListener('load', () => {
            const suites = document.querySelectorAll('.suite-body');
            suites.forEach((suite, index) => {
                suite.classList.add('expanded');
                const icon = document.getElementById('icon-' + index);
                if (icon) icon.classList.add('expanded');
            });
        });
    </script>
</body>
</html>`;
}
