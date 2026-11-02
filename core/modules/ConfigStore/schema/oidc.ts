import { z } from "zod";
import { typeDefinedConfig, typeNullableConfig } from "./utils";
import { SYM_FIXER_DEFAULT } from "@lib/symbols";


const enabled = typeDefinedConfig({
    name: 'OIDC Login Enabled',
    default: false,
    validator: z.boolean(),
    fixer: SYM_FIXER_DEFAULT,
});

const issuerUrl = typeNullableConfig({
    name: 'Issuer URL',
    default: null,
    validator: z.string().url().nullable(),
    fixer: SYM_FIXER_DEFAULT,
});

const clientId = typeNullableConfig({
    name: 'Client ID',
    default: null,
    validator: z.string().min(1).nullable(),
    fixer: SYM_FIXER_DEFAULT,
});

const clientSecret = typeNullableConfig({
    name: 'Client Secret',
    default: null,
    validator: z.string().min(1).nullable(),
    fixer: SYM_FIXER_DEFAULT,
});

const scopes = typeDefinedConfig({
    name: 'Scopes',
    default: 'openid profile email',
    validator: z.string().min(1).refine(
        (val) => val.split(/\s+/).includes('openid'),
        'The scopes must include `openid`.'
    ),
    fixer: SYM_FIXER_DEFAULT,
});

const usernameClaim = typeDefinedConfig({
    name: 'Username Claim',
    default: 'preferred_username',
    validator: z.string().min(1),
    fixer: SYM_FIXER_DEFAULT,
});

const buttonLabel = typeDefinedConfig({
    name: 'Login Button Label',
    default: 'Login with SSO',
    validator: z.string().min(1).max(32),
    fixer: SYM_FIXER_DEFAULT,
});

const requiredClaim = typeNullableConfig({
    name: 'Required Claim',
    default: null,
    validator: z.string().min(1).nullable(),
    fixer: SYM_FIXER_DEFAULT,
});

const requiredClaimValue = typeNullableConfig({
    name: 'Required Claim Value',
    default: null,
    validator: z.string().min(1).nullable(),
    fixer: SYM_FIXER_DEFAULT,
});

const linkByUsername = typeDefinedConfig({
    name: 'Link Existing Accounts by Username',
    default: false,
    validator: z.boolean(),
    fixer: SYM_FIXER_DEFAULT,
});

const autoCreateAccounts = typeDefinedConfig({
    name: 'Auto Create Accounts',
    default: false,
    validator: z.boolean(),
    fixer: SYM_FIXER_DEFAULT,
});

const defaultPermissions = typeDefinedConfig({
    name: 'Default Permissions',
    default: [],
    validator: z.string().min(1).array().transform((arr) => [...new Set(arr)]),
    fixer: (input: any) => {
        if (!Array.isArray(input)) return [];
        return [...new Set(input.filter((x) => typeof x === 'string' && x.length))];
    },
});


export default {
    enabled,
    issuerUrl,
    clientId,
    clientSecret,
    scopes,
    usernameClaim,
    buttonLabel,
    requiredClaim,
    requiredClaimValue,
    linkByUsername,
    autoCreateAccounts,
    defaultPermissions,
} as const;
