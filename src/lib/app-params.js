// App parametrar - förenklade utan Base44-beroende

const isNode = typeof window === 'undefined';

const getAppParams = () => {
  if (isNode) {
    return {
      appId: 'local-app',
      apiMode: 'mock'
    };
  }

  return {
    appId: 'local-app',
    apiMode: import.meta.env.VITE_API_MODE || 'mock'
  };
};

export const appParams = {
  ...getAppParams()
};
