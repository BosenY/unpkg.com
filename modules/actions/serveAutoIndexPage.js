import { renderToString, renderToStaticMarkup } from 'react-dom/server';

import AutoIndexApp from '../client/autoIndex/App';

import { getVersions } from '../utils/npm';

import createElement from './utils/createElement';
import createHTML from './utils/createHTML';
import createScript from './utils/createScript';
import getEntryPoint from './utils/getEntryPoint';
import getGlobalScripts from './utils/getGlobalScripts';
import MainTemplate from './utils/MainTemplate';

const doctype = '<!DOCTYPE html>';
const globalURLs =
  process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging'
    ? {
        '@emotion/core': '/@emotion/core@10.0.6/dist/core.umd.min.js',
        react: '/react@16.7.0/umd/react.production.min.js',
        'react-dom': '/react-dom@16.7.0/umd/react-dom.production.min.js'
      }
    : {
        '@emotion/core': '/@emotion/core@10.0.6/dist/core.umd.min.js',
        react: '/react@16.7.0/umd/react.development.js',
        'react-dom': '/react-dom@16.7.0/umd/react-dom.development.js'
      };

export default function serveAutoIndexPage(req, res) {
  getVersions(req.packageName).then(
    versions => {
      const data = {
        packageName: req.packageName,
        packageVersion: req.packageVersion,
        availableVersions: versions,
        filename: req.filename,
        entry: req.entry,
        entries: req.entries
      };
      const content = createHTML(
        renderToString(createElement(AutoIndexApp, data))
      );
      const entryPoint = getEntryPoint('autoIndex', 'iife');
      const elements = getGlobalScripts(entryPoint, globalURLs).concat(
        createScript(entryPoint.code)
      );

      const html =
        doctype +
        renderToStaticMarkup(
          createElement(MainTemplate, {
            title: `UNPKG - ${req.packageName}`,
            description: `The CDN for ${req.packageName}`,
            data,
            content,
            elements
          })
        );

      res
        .set({
          'Cache-Control': 'public, max-age=14400', // 4 hours
          'Cache-Tag': 'auto-index'
        })
        .send(html);
    },
    error => {
      console.error(error);

      res
        .status(500)
        .type('text')
        .send(`Cannot get versions for package "${req.packageVersion}"`);
    }
  );
}
