import { useState } from 'preact/hooks';
import { createServiceCategory } from '@/api/endpoints/admin';
import {
  createService,
  fetchAdminCatalog,
  fetchAdminServiceDetail,
  updateServiceInclusions,
  updateServiceOverview,
} from '@/service-station';
import type {
  ServiceDetail,
  ServiceInclusionItem,
  ServiceSummary,
} from '@/service-station';

type Definition = {
  title: string;
  category: string;
  description: string;
  inclusion: string;
};

type CategoryResolution = {
  id: number;
  platformId: string;
  name: string;
  action: 'reused' | 'created';
};

type SeedAction = 'created' | 'reused' | 'repaired' | 'skipped' | 'conflicted';

type SeedRecord = {
  action: SeedAction;
  title: string;
  serviceNativeId: number | null;
  servicePlatformId: string | null;
  categoryNativeId: number | null;
  categoryPlatformId: string | null;
  categoryAction: 'reused' | 'created' | null;
  assignedCategory: string | null;
  savedInclusion: string | null;
  overviewModuleState: string | null;
  inclusionsModuleState: string | null;
  lifecycleState: string | null;
  message?: string;
  proposedDifference?: { field: string; existing: unknown; supplied: unknown };
};

export type ServiceCatalogueSeedReport = {
  startedAt: string;
  finishedAt: string;
  catalogueSizeBefore: number;
  categoryCounts: { created: number; reused: number };
  serviceCounts: Record<SeedAction, number>;
  records: SeedRecord[];
};

const DEFINITIONS: Definition[] = [
  {
    title: 'Security Operations Center (SOC)',
    category: 'Security Operations',
    description: 'Stay ahead of cyber threats with 24/7 real-time security monitoring, rapid threat detection/isolation, expert incident response, and compliance management. Qty = endpoints.',
    inclusion: 'SOC Coverage — Classic',
  },
  {
    title: 'Advanced Threat Detection & Response (XDR)',
    category: 'Security Operations',
    description: 'Comprehensive XDR strategy with unified threat detection and response across every layer of your IT environment. Available bundled or standalone. Qty = endpoint-hours.',
    inclusion: 'XDR Threat Detection & Response — Essential',
  },
  {
    title: 'Proactive Privileged Access Management (PAM)',
    category: 'Security Operations',
    description: 'Your privileged users hold elevated access to critical systems, data, and functions — their entitlements are vetted, monitored, and analyzed to protect resources from cybersecurity threats and credential abuse. Qty = endpoint-hours.',
    inclusion: 'Privileged Access Management — Essential',
  },
  {
    title: 'Cyber Recovery Services (IRR-T)',
    category: 'Cyber Resilience & Recovery',
    description: "24/7 threat detection, response, and recovery by CompuZign's Global Security Incident Response & Recovery Team — specialized experts in forensics, EDR, virtualization, storage, backup, recovery, and regulatory compliance. Qty = recovery hours. Ask about post-recovery bundles.",
    inclusion: 'Cyber Recovery (IRR-T) — Classic',
  },
  {
    title: 'Disaster Recovery-as-a-Service (DRaaS)',
    category: 'Cyber Resilience & Recovery',
    description: 'Subscription-based automated backup, replication, and rapid recovery of critical systems and data — ensuring business continuity through outages, cyberattacks, or disasters. Qty = protected endpoints.',
    inclusion: 'DRaaS Protection — Classic',
  },
  {
    title: 'Backup-as-a-Service (BUaaS)',
    category: 'Cyber Resilience & Recovery',
    description: 'Automated backups and contingency planning to protect against data loss and ransomware. Qty = GB protected.',
    inclusion: 'Backup-as-a-Service (BUaaS) — Essential',
  },
  {
    title: 'Storage Migration',
    category: 'Migration-as-a-Service (MaaS)',
    description: 'Platform-agnostic storage migration with zero downtime, complete data protection, and seamless cloud transitions for modern enterprises. Delivered by Expert SMEs (per man-hour) or via subscription. Qty = man-hours.',
    inclusion: 'MaaS Expert SME Delivery — Classic',
  },
  {
    title: 'Compute Migration',
    category: 'Migration-as-a-Service (MaaS)',
    description: 'Comprehensive migration across physical, virtual, and cloud platforms — physical-to-cloud/virtual, virtual-to-cloud/physical, cloud-to-cloud/physical, and cloud-to-virtual — with zero downtime and automated workflows. Qty = man-hours.',
    inclusion: 'MaaS Expert SME Delivery — Classic',
  },
  {
    title: 'Cloud Migration & Transformation',
    category: 'Migration-as-a-Service (MaaS)',
    description: 'Expert cloud migration with 6R strategies across AWS, Azure & GCP — cloud adoption, cloud-to-cloud migration, hybrid integration, repatriation, resource optimization, and multi-cloud management — ensuring minimal downtime, data integrity, security, and regulatory compliance. Qty = man-hours.',
    inclusion: 'MaaS Expert SME Delivery — Classic',
  },
  {
    title: 'Network-as-a-Service (NaaS)',
    category: 'Network Services',
    description: 'Subscription-based, fully managed network infrastructure, connectivity, and services on demand — secure, scalable, and with no significant upfront capital investment. Qty = sites.',
    inclusion: 'Network-as-a-Service — Classic',
  },
];

function normalize(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '');
}

function inclusionId(label: string): string {
  return label
    .normalize('NFKD')
    .toLocaleLowerCase('en-US')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function effectiveOverview(detail: ServiceDetail) {
  return detail.drafts.overview ?? {
    title: detail.title,
    excerpt: detail.excerpt,
    content: detail.content,
    category_ids: detail.categories.map((category) => category.id),
  };
}

function effectiveInclusions(detail: ServiceDetail): ServiceInclusionItem[] {
  return detail.drafts.inclusions ?? detail.inclusions;
}

function lifecycleState(detail: ServiceDetail): string {
  return detail.platform_status === 'disabled' && detail.previous_platform_status === ''
    ? 'pending'
    : detail.platform_status;
}

function reportFromDetail(
  definition: Definition,
  action: SeedAction,
  category: CategoryResolution,
  detail: ServiceDetail,
  message?: string,
): SeedRecord {
  const inclusion = effectiveInclusions(detail).find(
    (item) => normalize(item.label) === normalize(definition.inclusion),
  );
  const assigned = detail.categories.find((item) => item.id === category.id)
    ?? (detail.drafts.overview?.category_ids.includes(category.id) ? { name: category.name } : undefined);
  return {
    action,
    title: definition.title,
    serviceNativeId: detail.id,
    servicePlatformId: detail.platformId,
    categoryNativeId: category.id,
    categoryPlatformId: category.platformId,
    categoryAction: category.action,
    assignedCategory: assigned?.name ?? null,
    savedInclusion: inclusion?.label ?? null,
    overviewModuleState: detail.module_status.overview ?? null,
    inclusionsModuleState: detail.module_status.inclusions ?? null,
    lifecycleState: lifecycleState(detail),
    ...(message ? { message } : {}),
  };
}

async function resolveCategory(
  definition: Definition,
  catalogueCategories: Array<{ id: number | null; platformId?: string; name: string }>,
): Promise<CategoryResolution> {
  const matches = catalogueCategories.filter(
    (category) => normalize(category.name) === normalize(definition.category),
  );
  if (matches.length > 1) {
    throw new Error(`Multiple normalized Category matches for “${definition.category}”.`);
  }
  const matched = matches[0];
  if (matched?.id != null) {
    if (matched.platformId) {
      return { id: matched.id, platformId: matched.platformId, name: matched.name, action: 'reused' };
    }
    // The inline route resolves an exact existing term and lets the Category
    // owner ensure its missing Platform identity without creating a duplicate.
    const response = await createServiceCategory({ name: matched.name, description: '' });
    if (!response.success || !response.category || response.category.id !== matched.id) {
      throw new Error(response.message ?? `Category identity resolution failed for “${definition.category}”.`);
    }
    return { id: matched.id, platformId: response.category.platformId, name: matched.name, action: 'reused' };
  }
  const response = await createServiceCategory({ name: definition.category, description: '' });
  if (!response.success || !response.category) {
    throw new Error(response.message ?? `Category creation failed for “${definition.category}”.`);
  }
  return {
    id: response.category.id,
    platformId: response.category.platformId,
    name: response.category.name,
    action: response.existing ? 'reused' : 'created',
  };
}

async function seedExisting(
  definition: Definition,
  summary: ServiceSummary,
  category: CategoryResolution,
): Promise<SeedRecord> {
  let detail = await fetchAdminServiceDetail(summary.id);
  const overview = effectiveOverview(detail);
  const descriptionMissing = overview.content.trim() === '';
  if (!descriptionMissing && overview.content !== definition.description) {
    return {
      ...reportFromDetail(definition, 'skipped', category, detail, 'Existing meaningful description differs; no write was made.'),
      proposedDifference: { field: 'description', existing: overview.content, supplied: definition.description },
    };
  }

  const inclusions = effectiveInclusions(detail);
  const normalizedInclusionMatches = inclusions.filter(
    (item) => normalize(item.label) === normalize(definition.inclusion),
  );
  if (normalizedInclusionMatches.length > 1) {
    return reportFromDetail(definition, 'conflicted', category, detail, 'Multiple normalized Inclusion matches exist.');
  }
  if (normalizedInclusionMatches.length === 1 && normalizedInclusionMatches[0].label !== definition.inclusion) {
    return {
      ...reportFromDetail(definition, 'skipped', category, detail, 'Existing Inclusion label differs; no write was made.'),
      proposedDifference: { field: 'inclusion', existing: normalizedInclusionMatches[0].label, supplied: definition.inclusion },
    };
  }

  const categoryMissing = !overview.category_ids.includes(category.id);
  const inclusionMissing = normalizedInclusionMatches.length === 0;
  if (!categoryMissing && !inclusionMissing && !descriptionMissing) {
    return reportFromDetail(definition, 'reused', category, detail);
  }
  if (categoryMissing || descriptionMissing) {
    await updateServiceOverview(detail.id, {
      title: overview.title,
      excerpt: overview.excerpt,
      content: descriptionMissing ? definition.description : overview.content,
      category_ids: [...new Set([...overview.category_ids, category.id])],
    });
  }
  if (inclusionMissing) {
    await updateServiceInclusions(detail.id, {
      inclusions: [
        ...inclusions,
        { id: inclusionId(definition.inclusion), label: definition.inclusion },
      ],
    });
  }
  detail = await fetchAdminServiceDetail(detail.id);
  return reportFromDetail(definition, 'repaired', category, detail);
}

export async function runTemporaryServiceCatalogueSeed(): Promise<ServiceCatalogueSeedReport> {
  const startedAt = new Date().toISOString();
  // Required preflight: the full current Admin catalogue is read before the
  // first Category, Service, Overview, or Inclusion mutation.
  const catalogue = await fetchAdminCatalog();
  const titleIndex = new Map<string, ServiceSummary[]>();
  for (const service of catalogue.stations) {
    const key = normalize(service.title);
    titleIndex.set(key, [...(titleIndex.get(key) ?? []), service]);
  }

  const categoryCache = new Map<string, CategoryResolution>();
  const records: SeedRecord[] = [];
  for (const definition of DEFINITIONS) {
    let category: CategoryResolution;
    try {
      const categoryKey = normalize(definition.category);
      category = categoryCache.get(categoryKey)
        ?? await resolveCategory(definition, catalogue.categories);
      categoryCache.set(categoryKey, category);
    } catch (error) {
      records.push({
        action: 'conflicted', title: definition.title,
        serviceNativeId: null, servicePlatformId: null,
        categoryNativeId: null, categoryPlatformId: null, categoryAction: null,
        assignedCategory: null, savedInclusion: null,
        overviewModuleState: null, inclusionsModuleState: null, lifecycleState: null,
        message: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    const matches = titleIndex.get(normalize(definition.title)) ?? [];
    if (matches.length > 1) {
      records.push({
        action: 'conflicted', title: definition.title,
        serviceNativeId: null, servicePlatformId: null,
        categoryNativeId: category.id, categoryPlatformId: category.platformId,
        categoryAction: category.action, assignedCategory: category.name,
        savedInclusion: null, overviewModuleState: null,
        inclusionsModuleState: null, lifecycleState: null,
        message: `Multiple normalized Service matches: ${matches.map((item) => item.id).join(', ')}.`,
      });
      continue;
    }

    try {
      if (matches.length === 1) {
        records.push(await seedExisting(definition, matches[0], category));
        continue;
      }
      const created = await createService({
        title: definition.title,
        excerpt: '',
        content: definition.description,
        category_ids: [category.id],
      });
      await updateServiceInclusions(created.service.id, {
        inclusions: [{ id: inclusionId(definition.inclusion), label: definition.inclusion }],
      });
      const detail = await fetchAdminServiceDetail(created.service.id);
      records.push(reportFromDetail(definition, 'created', category, detail));
    } catch (error) {
      records.push({
        action: 'skipped', title: definition.title,
        serviceNativeId: matches[0]?.id ?? null,
        servicePlatformId: matches[0]?.platformId ?? null,
        categoryNativeId: category.id, categoryPlatformId: category.platformId,
        categoryAction: category.action, assignedCategory: category.name,
        savedInclusion: null, overviewModuleState: null,
        inclusionsModuleState: null, lifecycleState: null,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const serviceCounts = { created: 0, reused: 0, repaired: 0, skipped: 0, conflicted: 0 };
  for (const record of records) serviceCounts[record.action]++;
  const categories = [...categoryCache.values()];
  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    catalogueSizeBefore: catalogue.stations.length,
    categoryCounts: {
      created: categories.filter((category) => category.action === 'created').length,
      reused: categories.filter((category) => category.action === 'reused').length,
    },
    serviceCounts,
    records,
  };
}

export function TemporaryServiceCatalogueSeedAction() {
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<ServiceCatalogueSeedReport | null>(null);
  const [error, setError] = useState('');

  async function run() {
    setRunning(true);
    setError('');
    try {
      const next = await runTemporaryServiceCatalogueSeed();
      setReport(next);
      console.table(next.records);
      console.info('Service catalogue seed report', next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div class="cz-temporary-service-seed">
      <button
        type="button"
        class="cz-service-deck__button cz-service-deck__button--primary"
        disabled={running}
        onClick={run}
      >
        {running ? 'Adding services…' : 'Add supplied services'}
      </button>
      {report ? <span>Created {report.serviceCounts.created}; reused {report.serviceCounts.reused}; repaired {report.serviceCounts.repaired}; skipped {report.serviceCounts.skipped}; conflicted {report.serviceCounts.conflicted}.</span> : null}
      {error ? <span role="alert">{error}</span> : null}
    </div>
  );
}
