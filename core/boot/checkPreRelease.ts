import consoleFactory from '@lib/console';
import fatalError from '@lib/fatalError';
import { chalkInversePad, msToDuration } from '@lib/misc';
const console = consoleFactory('ATTENTION');


//@ts-ignore esbuild will replace TX_PRERELEASE_EXPIRATION with a string
const PRERELEASE_EXPIRATION = parseInt(TX_PRERELEASE_EXPIRATION)

const expiredError = [
    'This pre-release version has expired, please update your txAdmin.',
    'Bye bye 👋',
]

const printExpirationBanner = (timeUntilExpiration: number) => {
    const timeLeft = msToDuration(timeUntilExpiration)
    console.error('This is a pre-release version of txAdmin!');
    console.error('This build is meant to be used by txAdmin beta testers.');
    console.error('txAdmin will automatically shut down when this pre-release expires.');
    console.error(`Time until expiration: ${chalkInversePad(timeLeft)}.`);
    console.error('For more information: https://txadmin.gg/discord.');
}

const cronCheckExpiration = () => {
    if (isNaN(PRERELEASE_EXPIRATION) || PRERELEASE_EXPIRATION === 0) return;

    const timeUntilExpiration = PRERELEASE_EXPIRATION - Date.now();
    if (timeUntilExpiration < 0) {
        fatalError.Boot(11, expiredError);
    } else if (timeUntilExpiration < 24 * 60 * 60 * 1000) {
        printExpirationBanner(timeUntilExpiration);
    }
}

export default () => {
    if (isNaN(PRERELEASE_EXPIRATION) || PRERELEASE_EXPIRATION === 0) return;

    const timeUntilExpiration = PRERELEASE_EXPIRATION - Date.now();
    if (timeUntilExpiration < 0) {
        fatalError.Boot(10, expiredError);
    }

    //First warning
    printExpirationBanner(timeUntilExpiration);

    //Check every 15 minutes
    setInterval(cronCheckExpiration, 15 * 60 * 1000);
};
