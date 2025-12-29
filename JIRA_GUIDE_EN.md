# 🎯 Quick Guide - JIRA Integration

## ⚙️ Initial Setup (One Time Only)

### 1. Copy example file
```bash
# The example.env already exists in the project, now create the .env
# Create manually or run:
copy example.env .env
```

### 2. Get your JIRA API Token
1. Go to: https://id.atlassian.com/manage-profile/security/api-tokens
2. Click on **"Create API token"**
3. Give it a name (ex: "Hoppscotch Tests")
4. Copy the generated token ⚠️ (it only appears once!)

### 3. Configure the .env file
Open the `.env` file and fill it with your data:

```env
JIRA_BASE_URL="https://your-company.atlassian.net"
JIRA_EMAIL="your.email@company.com"
JIRA_API_TOKEN="paste_your_token_here"
JIRA_PROJECT_KEY="DEV"
JIRA_ISSUE_TYPE="Bug"
```

**Where to find each information:**
- `JIRA_BASE_URL`: URL you use to access your JIRA (ex: https://mycompany.atlassian.net)
- `JIRA_EMAIL`: Your JIRA account email
- `JIRA_API_TOKEN`: Token you just generated
- `JIRA_PROJECT_KEY`: Project code (visible in ticket URLs, ex: if tickets are DEV-123, the key is DEV)
- `JIRA_ISSUE_TYPE`: Issue type (Bug, Task, Story, etc.)

### 4. Check permissions
Make sure your JIRA account has permission to:
- ✅ Create issues in the specified project
- ✅ Access JIRA REST API

---

## 🚀 How to Use

### Normal Execution (Fully Automatic)
```bash
npm test
```

**What happens:**
1. ✅ Runs all Hoppscotch tests
2. ✅ Generates `report.xml`
3. ✅ Generates `report.html` (beautiful visual)
4. ✅ Analyzes results
   - If **ALL passed**: ✅ "All tests passed! No JIRA issue needed."
   - If **ANY failed**: 🚨 Automatically creates issue in JIRA

### Create Issue Manually
```bash
# If you already ran the tests and want to create the issue later:
npm run jira-report
```

### Convert Report Only (without JIRA)
```bash
npm run convert-report
```

---

## 📊 What Goes to JIRA

When a test fails, the created issue contains:

### ✅ Included Information:
- **Summary**: `[Automated] API Test Failures - X test(s) failed`
- **Complete Description with:**
  - 📊 Statistics table (total, passed, failed, time)
  - ❌ List of failed test suites
  - 🔍 Details of each failed test
  - 📝 Complete error messages
  - 📅 Execution timestamp
  - 🔗 Link to tested API
  
### 🏷️ Automatic Metadata:
- **Labels**: `automated-test`, `api-test`, `hoppscotch`
- **Priority**: 
  - High (if >5 tests failed)
  - Medium (if ≤5 tests failed)
- **Issue Type**: As configured in .env (default: Bug)
- **Project**: As configured in .env

---

## 🔍 Example Output

### ✅ When All Tests Pass:
```
🔍 Checking test results for JIRA integration...

📊 Test Results Summary:
   Total Tests: 185
   ✅ Passed: 185
   ❌ Failed: 0
   ⏱️  Duration: 7.57s

✅ All tests passed! No JIRA issue needed.
```

### ❌ When Tests Fail:
```
🔍 Checking test results for JIRA integration...

📊 Test Results Summary:
   Total Tests: 185
   ✅ Passed: 183
   ❌ Failed: 2
   ⏱️  Duration: 7.82s

🚨 Test failures detected! Creating JIRA issue...

✅ JIRA issue created successfully!
   Issue Key: DEV-456
   Issue URL: https://your-company.atlassian.net/browse/DEV-456
```

---

## ⚠️ Troubleshooting

### "JIRA integration disabled - Missing configuration"
**Solution**: Configure the `.env` file with your credentials

### "Failed to create JIRA issue: 401 Unauthorized"
**Cause**: Invalid credentials
**Solution**: 
- Verify the email is correct
- Generate a new API token
- Confirm you copied the complete token

### "Failed to create JIRA issue: 404 Not Found"
**Cause**: Project or issue type not found
**Solution**:
- Verify `JIRA_PROJECT_KEY` is correct
- Confirm the issue type exists in the project
- Try creating an issue manually in JIRA

### "Permission Denied"
**Cause**: Your account doesn't have permission to create issues
**Solution**: Request "Create Issue" permissions in the project from your JIRA admin

### JIRA is not creating issues even though tests are failing
**Check**:
1. Does `.env` file exist in the project root?
2. Are all variables filled?
3. Did you run `npm test` (not just `hopp test`)?
4. Check the terminal output for error messages

---

## 🔐 Security

### ✅ Best Practices:
- ✅ `.env` is in `.gitignore` (won't go to Git)
- ✅ Use API token (never use your JIRA password)
- ✅ Revoke tokens you no longer use
- ✅ Don't share your `.env` with anyone

### ⚠️ NEVER do:
- ❌ Commit the `.env` file
- ❌ Share your API token
- ❌ Use your JIRA password instead of token
- ❌ Leave `.env` in public repositories

---

## 🧪 Testing the Integration

### 1. Create a deliberate error:
Edit `expandtesting.json` and change an assertion to fail:

```javascript
// Example: force a failure
pw.expect(200).toBe(999); // This will fail
```

### 2. Run tests:
```bash
npm test
```

### 3. Check:
- ✅ Should show "Test failures detected!"
- ✅ Should create issue in JIRA
- ✅ Issue link should appear in terminal
- ✅ Access the link and verify content

### 4. Revert the error:
Undo the change in `expandtesting.json`

---

## 📚 Useful Commands

```bash
# Run everything (tests + reports + JIRA)
npm test

# Convert XML → HTML only
npm run convert-report

# Create JIRA issue only (using last report.xml)
npm run jira-report

# See all available scripts
npm run
```

---

## 🎯 Configuration Checklist

- [ ] Node.js installed (v18.18.0+)
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file created in root
- [ ] JIRA_BASE_URL configured
- [ ] JIRA_EMAIL configured
- [ ] JIRA_API_TOKEN generated and configured
- [ ] JIRA_PROJECT_KEY configured
- [ ] Permissions verified in JIRA
- [ ] Test executed successfully (`npm test`)

---

**Done! Now every time you run `npm test` and there are failures, an issue will be automatically created in JIRA! 🎉**
