import {
    fetchAuthSession,
    getCurrentUser,
    signIn
} from 'aws-amplify/auth';
import { Amplify } from 'aws-amplify';


const args = require('yargs').argv;


Amplify.configure({
    Auth: {
        Cognito: {
            userPoolId: `${args.pool}`,
            userPoolClientId: `${args.client}`
        }
    }
});


async function createAuthToken() {
    const username = `${args.username}`
    const password = `${args.password}`

    const { isSignedIn, nextStep } = await signIn({
        username,
        password,
        options: {
            authFlowType: 'USER_PASSWORD_AUTH'
        }
    });

    try {
        const { username, userId, signInDetails } = await getCurrentUser();
        var session = (await fetchAuthSession()).tokens;

        let idToken = session?.idToken?.toString();
        let accessToken = session?.accessToken?.toString();

        console.log(idToken)
      } catch (err) {
        console.log(err);
      }
}

createAuthToken();
