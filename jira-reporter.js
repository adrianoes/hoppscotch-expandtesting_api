require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { parseString } = require('xml2js');
const axios = require('axios');
const FormData = require('form-data');

// Paths
const xmlPath = path.join(__dirname, 'reports', 'report.xml');
const htmlPath = path.join(__dirname, 'reports', 'report.html');

// JIRA Configuration from .env
const JIRA_CONFIG = {
    baseUrl: process.env.JIRA_BASE_URL,
    email: process.env.JIRA_EMAIL,
    apiToken: process.env.JIRA_API_TOKEN,
    projectKey: process.env.JIRA_PROJECT_KEY,
    issueType: process.env.JIRA_ISSUE_TYPE || 'Bug'
};

// Validate JIRA configuration
function validateConfig() {
    const missing = [];
    if (!JIRA_CONFIG.baseUrl) missing.push('JIRA_BASE_URL');
    if (!JIRA_CONFIG.email) missing.push('JIRA_EMAIL');
    if (!JIRA_CONFIG.apiToken) missing.push('JIRA_API_TOKEN');
    if (!JIRA_CONFIG.projectKey) missing.push('JIRA_PROJECT_KEY');

    if (missing.length > 0) {
        console.log('⚠️  JIRA integration disabled - Missing configuration:');
        missing.forEach(key => console.log(`   - ${key}`));
        console.log('   Please configure these variables in .env file');
        return false;
    }
    return true;
}

// Read and parse XML report
function parseReport() {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(xmlPath)) {
            reject(new Error('XML report not found. Run tests first.'));
            return;
        }

        fs.readFile(xmlPath, 'utf-8', (err, xmlData) => {
            if (err) {
                reject(err);
                return;
            }

            parseString(xmlData, (err, result) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(result);
            });
        });
    });
}

// Analyze test results
function analyzeResults(data) {
    const testsuites = data.testsuites;
    const totalTests = parseInt(testsuites.$.tests);
    const totalFailures = parseInt(testsuites.$.failures);
    const totalErrors = parseInt(testsuites.$.errors);
    const totalTime = parseFloat(testsuites.$.time).toFixed(2);
    const totalPassed = totalTests - totalFailures - totalErrors;

    const failedSuites = [];
    const suites = testsuites.testsuite || [];

    suites.forEach(suite => {
        const suiteFailures = parseInt(suite.$.failures);
        const suiteErrors = parseInt(suite.$.errors);

        if (suiteFailures > 0 || suiteErrors > 0) {
            const failedTests = [];
            
            if (suite.testcase) {
                suite.testcase.forEach(test => {
                    const hasFailure = test.failure && test.failure.length > 0;
                    const hasError = test.error && test.error.length > 0;

                    if (hasFailure || hasError) {
                        let errorMessage = '';
                        if (hasFailure) {
                            errorMessage = test.failure[0]._ || test.failure[0];
                        }
                        if (hasError) {
                            errorMessage = test.error[0]._ || test.error[0];
                        }

                        failedTests.push({
                            name: test.$.name,
                            error: typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage)
                        });
                    }
                });
            }

            failedSuites.push({
                name: suite.$.name,
                failures: suiteFailures,
                errors: suiteErrors,
                time: suite.$.time,
                tests: failedTests
            });
        }
    });

    return {
        totalTests,
        totalFailures,
        totalErrors,
        totalPassed,
        totalTime,
        hasFailures: totalFailures > 0 || totalErrors > 0,
        failedSuites
    };
}

// Attach report files to JIRA issue
async function attachReportsToIssue(issueKey, auth) {
    try {
        // Attach XML report
        if (fs.existsSync(xmlPath)) {
            const xmlContent = fs.readFileSync(xmlPath);
            const formData = new FormData();
            formData.append('file', xmlContent, 'report.xml');
            
            await axios.post(
                `${JIRA_CONFIG.baseUrl}/rest/api/2/issue/${issueKey}/attachments`,
                formData,
                {
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        ...formData.getHeaders(),
                        'X-Atlassian-Token': 'no-check'
                    }
                }
            );
        }

        // Attach HTML report
        if (fs.existsSync(htmlPath)) {
            const htmlContent = fs.readFileSync(htmlPath);
            const formData = new FormData();
            formData.append('file', htmlContent, 'report.html');
            
            await axios.post(
                `${JIRA_CONFIG.baseUrl}/rest/api/2/issue/${issueKey}/attachments`,
                formData,
                {
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        ...formData.getHeaders(),
                        'X-Atlassian-Token': 'no-check'
                    }
                }
            );
        }
        
        return { success: true };
    } catch (error) {
        return { 
            success: false, 
            error: error.response ? error.response.data : error.message 
        };
    }
}

// Create JIRA issues (one per failed suite/request)
async function createJiraIssues(results) {
    const auth = Buffer.from(`${JIRA_CONFIG.email}:${JIRA_CONFIG.apiToken}`).toString('base64');
    const createdIssues = [];
    
    // Create one issue per failed suite
    for (const suite of results.failedSuites) {
        const summary = `[Automated] ${suite.name} - ${suite.tests.length} test(s) failed`;
        
        // Build description for this specific suite
        let description = `*Request Failed: ${suite.name}*\n\n`;
        description += `Failures: ${suite.failures} | Errors: ${suite.errors} | Time: ${suite.time}s\n\n`;
        description += `*Failed Tests*\n\n`;
        
        suite.tests.forEach((test, testIndex) => {
            description += `${testIndex + 1}. *${test.name}*\n`;
            if (test.error) {
                description += `{code}${test.error}{code}\n\n`;
            }
        });
        
        description += `----\n`;
        description += `*Execution Summary*\n`;
        description += `Total Tests: ${results.totalTests} | Passed: ${results.totalPassed} | Failed: ${results.totalFailures + results.totalErrors} | Duration: ${results.totalTime}s\n`;
        description += `Generated: ${new Date().toLocaleString('pt-BR')} | API: https://practice.expandtesting.com/notes/api\n`;

        // Prepare issue data for API v2
        const issueData = {
            fields: {
                project: {
                    key: JIRA_CONFIG.projectKey
                },
                summary: summary,
                description: description,
                issuetype: {
                    name: JIRA_CONFIG.issueType
                },
                labels: ['automated-test', 'api-test', 'hoppscotch']
            }
        };

        try {
            console.log(`📝 Creating issue for: ${suite.name}`);
            
            const response = await axios.post(
                `${JIRA_CONFIG.baseUrl}/rest/api/2/issue`,
                issueData,
                {
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                }
            );

            const issueKey = response.data.key;
            
            // Attach report files
            console.log(`   📎 Attaching report files...`);
            const attachResult = await attachReportsToIssue(issueKey, auth);
            
            if (attachResult.success) {
                console.log(`   ✅ Reports attached successfully\n`);
            } else {
                console.log(`   ⚠️  Warning: Could not attach reports\n`);
            }

            createdIssues.push({
                success: true,
                suite: suite.name,
                key: issueKey,
                id: response.data.id,
                url: `${JIRA_CONFIG.baseUrl}/browse/${issueKey}`
            });
            
        } catch (error) {
            createdIssues.push({
                success: false,
                suite: suite.name,
                error: error.response ? error.response.data : error.message
            });
        }
    }
    
    return createdIssues;
}

// Main execution
async function main() {
    console.log('\n🔍 Checking test results for JIRA integration...\n');

    // Validate configuration
    if (!validateConfig()) {
        console.log('');
        return;
    }

    // Test JIRA connection
    console.log('🔗 Testing JIRA connection...');
    const auth = Buffer.from(`${JIRA_CONFIG.email}:${JIRA_CONFIG.apiToken}`).toString('base64');
    
    try {
        // Test authentication and project access
        const projectResponse = await axios.get(
            `${JIRA_CONFIG.baseUrl}/rest/api/3/project/${JIRA_CONFIG.projectKey}`,
            {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Accept': 'application/json'
                }
            }
        );
        console.log(`✅ Project found: ${projectResponse.data.name}`);
        
        // Get available issue types for this project
        const issueTypesResponse = await axios.get(
            `${JIRA_CONFIG.baseUrl}/rest/api/3/issue/createmeta/${JIRA_CONFIG.projectKey}/issuetypes`,
            {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Accept': 'application/json'
                }
            }
        );
        
        const availableTypes = issueTypesResponse.data.issueTypes.map(t => t.name);
        console.log(`✅ Available issue types: ${availableTypes.join(', ')}`);
        
        if (!availableTypes.includes(JIRA_CONFIG.issueType)) {
            console.log(`❌ Issue type "${JIRA_CONFIG.issueType}" not found in project!`);
            console.log(`   Please use one of: ${availableTypes.join(', ')}\n`);
            process.exit(1);
        }
        
        console.log(`✅ Issue type "${JIRA_CONFIG.issueType}" is valid\n`);
        
        // Get required fields for Bug issue type
        const createMetaResponse = await axios.get(
            `${JIRA_CONFIG.baseUrl}/rest/api/3/issue/createmeta/${JIRA_CONFIG.projectKey}/issuetypes`,
            {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Accept': 'application/json'
                }
            }
        );
        
        const bugIssueType = createMetaResponse.data.issueTypes.find(t => t.name === JIRA_CONFIG.issueType);
        if (bugIssueType && bugIssueType.fields) {
            const requiredFields = Object.keys(bugIssueType.fields).filter(
                key => bugIssueType.fields[key].required
            );
            console.log(`📋 Required fields for ${JIRA_CONFIG.issueType}: ${requiredFields.join(', ')}\n`);
        }
        
    } catch (error) {
        console.log('❌ JIRA connection failed:');
        console.log(`   Status: ${error.response?.status}`);
        console.log(`   Message: ${error.response?.data?.errorMessages || error.message}\n`);
        process.exit(1);
    }

    try {
        // Parse report
        const data = await parseReport();
        const results = analyzeResults(data);

        // Display summary
        console.log('📊 Test Results Summary:');
        console.log(`   Total Tests: ${results.totalTests}`);
        console.log(`   ✅ Passed: ${results.totalPassed}`);
        console.log(`   ❌ Failed: ${results.totalFailures + results.totalErrors}`);
        console.log(`   ⏱️  Duration: ${results.totalTime}s\n`);

        // Check if there are failures
        if (!results.hasFailures) {
            console.log('✅ All tests passed! No JIRA issue needed.\n');
            return;
        }

        // Create JIRA issues (one per failed suite)
        console.log('🚨 Test failures detected! Creating JIRA issues...\n');
        
        const jiraResults = await createJiraIssues(results);

        // Display results
        const successCount = jiraResults.filter(r => r.success).length;
        const failureCount = jiraResults.filter(r => !r.success).length;

        jiraResults.forEach(result => {
            if (result.success) {
                console.log(`✅ Issue created for: ${result.suite}`);
                console.log(`   Issue Key: ${result.key}`);
                console.log(`   Issue URL: ${result.url}\n`);
            } else {
                console.log(`❌ Failed to create issue for: ${result.suite}`);
                console.log(`   Error: ${JSON.stringify(result.error, null, 2)}\n`);
            }
        });

        console.log(`\n📊 Summary: ${successCount} issue(s) created, ${failureCount} failed\n`);
        
        if (failureCount > 0) {
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Run
main();
