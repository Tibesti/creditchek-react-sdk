<p align="center">
    <img title="CreeditChek" height="200" src="https://docs.creditchek.africa/img/nav_logo.svg" width="50%"/>
</p>

# CreditChek React SDK

## Introduction

The CreditChek Secured SDK Engine is a lightweight product that gives businesses access to a pool of CreditChek API services and a decision engine.

The CreditChek Secured SDK Engine uses the same technology as our main application to allow your customers to carry out assessments. The customer assessments help you determine the decisions to make when they apply to your product. With our Secured SDK, you are able to customize the functionalities according to how you see fit for your business. The assessments carried out on this secured SDK includes:

- Identity verification
- Credit Assessments
- Income Assessments
- Recova setup


## Installation

Install the SDK

```bash
$ npm install creditchek-react-sdk

# or
$ yarn add creditchek-react-sdk

```


## Usage

Add CreditChek SDK to your projects using the following simple guide:

```javascript
import creditchekSDK from 'creditchek-react-sdk';

export default function App() {
    const handleClick = () => {
        creditchekSDK.open({
            publicKey: "YOUR_APP_PUBLIC_KEY",
            module: ["xxxx"], 
            onComplete: (result) => {
                // when each assessment is complete
                console.log("Result:", result);
            },
            onClose: () => {
                // optional: runs when the creditchek widget is closed
            },
        });
    };

    return (
        <div className="App">
            <h1>CreditChek SDK Test</h1>
            <button onClick={handleClick}>Launch SDK</button>
        </div>
    );
}
```


## Parameters

| Parameter           | Always Required ? | Description          |
| ------------------- | ----------------- | ---------------------|
| publicKey           | True              | This is the your API public key. It can be found on the app section of the dashboard. |
| module              | True              | This is an array of strings that determine the layout of the SDK by module selection. At least one must be included. Options - "identity", "income", "credit", "recova" |


# Support

For additional assistance using this library, please create an issue on the Github repo or contact the team via [email](mailto:support@creditchek.africa).
