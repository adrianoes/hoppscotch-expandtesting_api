# hoppscotch-expandtesting_api

API testing in [expandtesting](https://practice.expandtesting.com/notes/api/api-docs/). This project contains basic examples on how to use Hoppscotch to test API. All the necessary support documentation to develop this project is placed here.

# Pre-requirements:

| Requirement                     | Version        | Note                                                            |
| :------------------------------ |:---------------| :-------------------------------------------------------------- |
| Node.js                         | 18.18.0        | -                                                               |
| node-gyp                        | 10.2.0         | -                                                               |
| Hoppscotch CLI                  | 0.11.0         | -                                                               |
| Hoppscotch                      | 24.8.2.0       | -                                                               |
             
# Installation:

- See [Node.js page](https://nodejs.org/en) and install the aforementioned Node.js version. Keep all the preferenced options as they are.
- See [Hoppscotch page](https://hoppscotch.com/download), download it and install it keeping all the preferenced options as they are.
- Open the project folder in terminal and execute ```npm install -g node-gyp``` to install node-gyp.
- Open the project folder in terminal and execute ```npm i -g @hoppscotch/cli``` to install Hoppscotch CLI.

# Tests:

- Execute ```hopp test -e expandtesting_env.json -d 1000 expandtesting.json --reporter-junit ./reports/report.xml``` to execute expandtesting.json collection configured with expandtesting_env.json environment variable file and export a report.xml file to reports folder. 

# Support:

- [expandtesting API documentation page](https://practice.expandtesting.com/notes/api/api-docs/)
- [expandtesting API demonstration page](https://www.youtube.com/watch?v=bQYvS6EEBZc)
- [Pre-request scripts](https://docs.hoppscotch.io/documentation/getting-started/rest/pre-request-scripts#generating-random-values-to-test-api)
- [JavaScript Random](https://www.w3schools.com/js/js_random.asp)
- [How to generate random words in JavaScript? [duplicate]](https://stackoverflow.com/a/13237436/10519428)
- [JavaScript Boolean toString()](https://www.w3schools.com/jsref/jsref_tostring_boolean.asp)
- [Hoppscotch CLI](https://docs.hoppscotch.io/documentation/clients/cli/overview#windows-and-macos)
- [node-gyp page](https://github.com/nodejs/node-gyp)

# Tips:

- UI and API tests to send password reset link to user's email and API tests to verify a password reset token and reset a user's password must be tested manually as they rely on e-mail verification.

