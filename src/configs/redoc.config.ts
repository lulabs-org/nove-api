import { RedocOptions } from 'nestjs-redoc';

export const redocConfig: RedocOptions = {
  title: 'Nove API',
  logo: {
    url: 'https://redocly.github.io/redoc/petstore-logo.png',
    backgroundColor: '#FFFFFF',
    altText: 'LuLab Logo',
  },
  sortPropsAlphabetically: true,
  hideDownloadButton: false,
  hideHostname: false,
  expandResponses: '200,201',
  requiredPropsFirst: true,
  noAutoAuth: false,
  theme: {
    colors: {
      primary: {
        main: '#6554c0',
      },
    },
    typography: {
      fontFamily: 'muli,sans-serif',
      fontSize: '16px',
      lineHeight: '1.5',
      code: {
        fontFamily: 'monospace',
        color: '#e53935',
        backgroundColor: '#f5f5f5',
      },
    },
    sidebar: {
      width: '300px',
      backgroundColor: '#252b36',
      textColor: '#ffffff',
    },
  },
};
