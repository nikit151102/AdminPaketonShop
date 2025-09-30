export const environment = {
    production: 'https://xn--80ajjteep7bg.xn--80akonecy.xn--p1ai/api',
    dev: '',
    domain: 'https://xn--80ajjteep7bg.xn--80akonecy.xn--p1ai'
}


export const localStorageEnvironment = {
    auth: {
        key: 'pkt_auth',
        ttl: 10000
    },
    user: {
        key: 'pkt_user',
        ttl: 600
    }
}


export const sessionStorageEnvironment = {
    auth: {
        key: 'pkt_',
        ttl: 600
    },
    user: {
        key: 'pkt_user',
        ttl: 600
    }
}