/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { useParams } from 'react-router-dom';
import { EuiEmptyPrompt, EuiPanel } from '@elastic/eui';

import { useKibana } from '../../../utils/kibana_react';
import { usePluginContext } from '../../../hooks/use_plugin_context';
import { useBreadcrumbs } from '../../../hooks/use_breadcrumbs';
import { useFetchAlertDetail } from '../../../hooks/use_fetch_alert_detail';

import { AlertSummary, HeaderActions, PageTitle } from '.';
import { CenterJustifiedSpinner } from '../../rule_details/components/center_justified_spinner';
import PageNotFound from '../../404';

import { ObservabilityAppServices } from '../../../application/types';
import { AlertDetailsPathParams } from '../types';
import { observabilityFeatureId } from '../../../../common';
import { paths } from '../../../config/paths';

export function AlertDetails() {
  const {
    http,
    cases: {
      helpers: { canUseCases },
      ui: { getCasesContext },
    },
  } = useKibana<ObservabilityAppServices>().services;
  const { ObservabilityPageTemplate, config } = usePluginContext();
  const { alertId } = useParams<AlertDetailsPathParams>();
  const [isLoading, alert] = useFetchAlertDetail(alertId);

  const CasesContext = getCasesContext();
  const userCasesPermissions = canUseCases();

  useBreadcrumbs([
    {
      href: http.basePath.prepend(paths.observability.alerts),
      text: i18n.translate('xpack.observability.breadcrumbs.alertsLinkText', {
        defaultMessage: 'Alerts',
      }),
    },
  ]);

  // Redirect to the the 404 page when the user hit the page url directly in the browser while the feature flag is off.
  if (!config.unsafe.alertDetails.enabled) {
    return <PageNotFound />;
  }

  if (isLoading) {
    return <CenterJustifiedSpinner />;
  }

  if (!isLoading && !alert)
    return (
      <EuiPanel data-test-subj="alertDetailsError">
        <EuiEmptyPrompt
          iconType="alert"
          color="danger"
          title={
            <h2>
              {i18n.translate('xpack.observability.alertDetails.errorPromptTitle', {
                defaultMessage: 'Unable to load alert details',
              })}
            </h2>
          }
          body={
            <p>
              {i18n.translate('xpack.observability.alertDetails.errorPromptBody', {
                defaultMessage: 'There was an error loading the alert details.',
              })}
            </p>
          }
        />
      </EuiPanel>
    );

  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle: <PageTitle title={alert?.reason} active={Boolean(alert?.active)} />,
        rightSideItems: [
          <CasesContext
            owner={[observabilityFeatureId]}
            permissions={userCasesPermissions}
            features={{ alerts: { sync: false } }}
          >
            <HeaderActions alert={alert} />
          </CasesContext>,
        ],
        bottomBorder: false,
      }}
      data-test-subj="alertDetails"
    >
      <AlertSummary alert={alert} />
    </ObservabilityPageTemplate>
  );
}
