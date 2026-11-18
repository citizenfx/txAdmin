type CleanFullPathReturn = { path: string } | { error: string };

export default function cleanFullPath(input: string, isWindows): CleanFullPathReturn {
    //Path must be a string
    if (typeof input !== 'string') {
        return { error: 'path must be a string' };
    }

    //Path must not be a windows extended path (namespace?)
    if (input.startsWith('\\\\?\\')) {
        return { error: 'unsupported windows path format' };
    }

    //Convert backslashes to slashes and remove duplicate slashes
    const slashified = input.replaceAll(/\\/g, '/').replaceAll(/\/+/g, '/');

    //Path must not be empty
    if (slashified.length === 0) {
        return { error: 'empty path' };
    }

    //Path must be absolute
    if (isWindows && !/^[a-zA-Z]:\//.test(slashified)) {
        return { error: 'windows paths must be absolute and start with a drive letter like `c:/`' };
    } else if (!isWindows && !/^\//.test(slashified)) {
        return { error: 'linux paths must be absolute and start with a slash' };
    }

    //Path must be fully resolved
    if (/\/\.{1,2}(\/|$)/.test(slashified)) {
        return { error: 'path contains unresolved parts (eg. `/../`)' };
    }

    //Return without the trailing slash
    if (slashified.endsWith('/')) {
        return { path: slashified.slice(0, -1) };
    } else {
        return { path: slashified };
    }
}
