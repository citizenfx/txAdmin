const modulename = 'AdminStore:OidcProvider';
import { BaseClient, Issuer, custom, generators } from 'openid-client';
import consoleFactory from '@lib/console';
const console = consoleFactory(modulename);

export type OidcUserInfo = {
    issuer: string;
    sub: string;
    username: string | undefined;
    email: string | undefined;
    picture: string | undefined;
    claims: Record<string, unknown>;
};

export type OidcAuthRequest = {
    authUrl: string;
    state: string;
    nonce: string;
    codeVerifier: string;
};


/**
 * Generic OpenID Connect provider, configured via txConfig.oidc
 */
export default class OidcProvider {
    private client?: BaseClient;
    private clientConfigKey?: string;

    /**
     * Returns if the provider is enabled and has all required configs
     */
    get isEnabled() {
        const cfg = txConfig.oidc;
        return cfg.enabled && !!cfg.issuerUrl && !!cfg.clientId && !!cfg.clientSecret;
    }

    /**
     * Returns the issuer the client is currently configured for
     */
    get issuer() {
        return this.client?.issuer.metadata.issuer;
    }

    /**
     * Drops the cached client, forcing a new discovery on the next request
     */
    reset() {
        this.client = undefined;
        this.clientConfigKey = undefined;
    }

    /**
     * Returns the cached client, or discovers the issuer and creates a new one.
     * The cache is invalidated automatically if the relevant configs change.
     */
    private async getClient() {
        const cfg = txConfig.oidc;
        if (!this.isEnabled) throw new Error('OIDC login is not enabled or not configured.');
        const configKey = JSON.stringify([cfg.issuerUrl, cfg.clientId, cfg.clientSecret]);
        if (this.client && this.clientConfigKey === configKey) return this.client;

        const issuer = await Issuer.discover(cfg.issuerUrl!);
        this.client = new issuer.Client({
            client_id: cfg.clientId!,
            client_secret: cfg.clientSecret!,
            response_types: ['code'],
        });
        this.client[custom.clock_tolerance] = 120;
        this.clientConfigKey = configKey;
        console.verbose.ok(`Discovered OIDC issuer: ${issuer.metadata.issuer}`);
        return this.client;
    }

    /**
     * Tests the discovery of an issuer, used when saving the settings
     */
    static async testDiscovery(issuerUrl: string) {
        const issuer = await Issuer.discover(issuerUrl);
        return issuer.metadata.issuer;
    }

    /**
     * Returns the Provider Auth URL and the secrets that need to be stored in the session
     */
    async getAuthRequest(redirectUri: string): Promise<OidcAuthRequest> {
        const client = await this.getClient();
        const state = generators.state();
        const nonce = generators.nonce();
        const codeVerifier = generators.codeVerifier();
        const authUrl = client.authorizationUrl({
            redirect_uri: redirectUri,
            scope: txConfig.oidc.scopes,
            response_type: 'code',
            state,
            nonce,
            code_challenge: generators.codeChallenge(codeVerifier),
            code_challenge_method: 'S256',
        });
        return { authUrl, state, nonce, codeVerifier };
    }

    /**
     * Processes the callback, validates the ID Token and returns the user info
     */
    async processCallback(
        sessRedirectUri: string,
        sessAuthRequest: Omit<OidcAuthRequest, 'authUrl'>,
        callbackUri: string,
    ): Promise<OidcUserInfo> {
        const client = await this.getClient();
        const params = client.callbackParams(callbackUri);
        const tokenSet = await client.callback(sessRedirectUri, params, {
            state: sessAuthRequest.state,
            nonce: sessAuthRequest.nonce,
            code_verifier: sessAuthRequest.codeVerifier,
        });
        if (!tokenSet.id_token) throw new Error('id_token not present');
        const idClaims = tokenSet.claims() as Record<string, unknown>;

        //Userinfo is optional, some providers only put the claims in the ID Token
        let userinfoClaims: Record<string, unknown> = {};
        if (tokenSet.access_token && client.issuer.metadata.userinfo_endpoint) {
            try {
                userinfoClaims = await client.userinfo(tokenSet.access_token) as Record<string, unknown>;
                if (userinfoClaims.sub !== idClaims.sub) {
                    throw new Error('userinfo sub does not match the id_token sub');
                }
            } catch (error) {
                console.verbose.warn(`Failed to get OIDC userinfo: ${(error as Error).message}`);
                userinfoClaims = {};
            }
        }
        const claims = { ...userinfoClaims, ...idClaims };

        if (typeof claims.sub !== 'string' || !claims.sub.length) {
            throw new Error('sub claim not present');
        }
        const usernameClaim = claims[txConfig.oidc.usernameClaim];
        const username = typeof usernameClaim === 'string' && usernameClaim.length
            ? usernameClaim
            : undefined;
        const picture = typeof claims.picture === 'string' && claims.picture.startsWith('https://')
            ? claims.picture
            : undefined;

        return {
            issuer: client.issuer.metadata.issuer,
            sub: claims.sub,
            username,
            email: typeof claims.email === 'string' ? claims.email : undefined,
            picture,
            claims,
        };
    }
};
