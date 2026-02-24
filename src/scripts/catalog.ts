import {
  applyEmptyStateAction,
  applyPreset,
  buildActiveFilterChips,
  clearFilter,
  compareSlugsToQueryValue,
  DEFAULT_STATE,
  filterRows,
  getEmptyStateActions,
  queryValueToCompareSlugs,
  queryToState,
  sortRows,
  stateToQuery,
  type EmptyStateAction,
  type FilterChipKey,
  type CatalogItem,
  type CatalogState
} from './catalog-core';
import { maintenanceSignal, SCORE_HELP_TEXT } from '../lib/score-model';
import { trackEvent, type TrackPayload } from './analytics';

type WorkerResult = {
  type: 'result';
  requestId: number;
  total: number;
  visible: CatalogItem[];
};

function track(eventName: string, payload: TrackPayload = {}) {
  trackEvent(eventName, payload);
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function setControlValues(state: CatalogState) {
  const searchInput = document.getElementById('searchInput') as HTMLInputElement;
  const categorySelect = document.getElementById('categorySelect') as HTMLSelectElement;
  const starsSelect = document.getElementById('starsSelect') as HTMLSelectElement;
  const updatedSelect = document.getElementById('updatedSelect') as HTMLSelectElement;
  const confidenceSelect = document.getElementById('confidenceSelect') as HTMLSelectElement;
  const sortSelect = document.getElementById('sortSelect') as HTMLSelectElement;
  const featuredOnly = document.getElementById('featuredOnly') as HTMLInputElement;

  searchInput.value = state.q;
  categorySelect.value = state.category;
  starsSelect.value = String(state.stars);
  updatedSelect.value = String(state.updated);
  confidenceSelect.value = String(state.confidence);
  sortSelect.value = state.sort;
  featuredOnly.checked = state.featured;
}

function createSkeletonCard(): HTMLElement {
  const article = document.createElement('article');
  article.className = 'catalog-card-2026';
  article.innerHTML = `
    <div class="card-body gap-3 p-5 sm:p-6">
      <div class="skeleton skeleton-shimmer h-5 w-2/3"></div>
      <div class="skeleton skeleton-shimmer h-4 w-full"></div>
      <div class="skeleton skeleton-shimmer h-4 w-4/5"></div>
      <div class="skeleton skeleton-shimmer h-4 w-1/2"></div>
      <div class="mt-2 flex items-center justify-between">
        <div class="skeleton skeleton-shimmer h-4 w-20"></div>
        <div class="skeleton skeleton-shimmer h-8 w-40"></div>
      </div>
    </div>
  `;
  return article;
}

function createCard(item: CatalogItem, dateFormatter: Intl.DateTimeFormat, isSelectedForCompare: boolean): HTMLElement {
  const article = document.createElement('article');
  article.className = 'catalog-card-2026';

  const topics = Array.isArray(item.topics) ? item.topics.filter(Boolean).slice(0, 2) : [];
  const updatedLabel = item.updatedAt ? dateFormatter.format(new Date(item.updatedAt)) : 'Unknown';
  const confidence = Math.round(Number(item.scoreConfidence ?? item.recommendedScore));
  const compareButtonClass = isSelectedForCompare ? 'btn btn-xs btn-primary' : 'btn btn-xs btn-outline';
  const compareButtonLabel = isSelectedForCompare ? 'In comparison' : 'Compare';

  article.innerHTML = `
    <div class="card-body gap-4 p-5 sm:p-6">
      <div class="flex items-start justify-between gap-3">
        <div class="space-y-2">
          <h3 class="card-title text-xl font-bold text-base-content">${escapeHtml(item.name)}</h3>
          <p class="text-xs text-base-content/70">by ${escapeHtml(item.author)} · ${escapeHtml(item.category)}</p>
        </div>
        <div class="text-right">
          <button type="button" class="${compareButtonClass}" data-compare-toggle data-slug="${escapeHtml(item.slug)}" aria-pressed="${isSelectedForCompare ? 'true' : 'false'}">
            ${compareButtonLabel}
          </button>
          <div class="flex items-center justify-end gap-1">
            <p class="text-[10px] uppercase tracking-[0.14em] text-base-content/55">HACS Score</p>
            <button type="button" class="btn btn-ghost btn-xs px-1" data-score-help title="${escapeHtml(SCORE_HELP_TEXT)}" aria-label="How this score is calculated">?</button>
          </div>
          <p class="text-2xl font-extrabold text-accent">${item.recommendedScore}</p>
        </div>
      </div>
      <p class="text-sm leading-6 text-base-content/85">${escapeHtml(item.description)}</p>
      <div class="flex flex-wrap items-center gap-2 text-xs text-base-content/70">
        <span class="badge badge-outline badge-sm">${escapeHtml(item.repo)}</span>
        <span class="badge badge-outline badge-sm">Domain: ${escapeHtml(item.domain || 'n/a')}</span>
        <span class="badge badge-outline badge-sm">Updated: ${escapeHtml(updatedLabel)}</span>
        <span class="badge badge-success badge-outline badge-sm">Confidence: ${confidence}</span>
      </div>
      ${topics.length ? `<div class="flex flex-wrap gap-1.5">${topics.map((topic) => `<span class="badge badge-outline badge-sm">#${escapeHtml(topic)}</span>`).join('')}</div>` : ''}
      <div class="card-actions mt-auto flex-wrap items-center justify-between gap-2 pt-1">
        <span class="flex items-center gap-1 text-sm font-semibold text-success" aria-label="${item.stars} stars">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.2 6.4 20.2l1.1-6.2L3 9.6l6.2-.9L12 3Z" />
          </svg>
          ${item.stars.toLocaleString('en-US')} stars
        </span>
        <div class="flex flex-wrap justify-end gap-2">
          <a
            class="btn btn-sm btn-primary gap-1.5"
            href="${escapeHtml(item.detailsPath)}"
            data-umami-event="catalog_open_score_profile"
            data-umami-slug="${escapeHtml(item.slug)}"
            data-umami-category="${escapeHtml(item.category)}"
            data-umami-location="catalog_grid"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 3v18h18" />
              <path stroke-linecap="round" stroke-linejoin="round" d="m19 9-5 5-4-4-4 4" />
            </svg>
            Open Score Profile
          </a>
          <a
            class="btn btn-sm btn-outline gap-1.5"
            href="${escapeHtml(item.url)}"
            target="_blank"
            rel="noopener noreferrer"
            data-umami-event="catalog_open_github"
            data-umami-slug="${escapeHtml(item.slug)}"
            data-umami-category="${escapeHtml(item.category)}"
            data-umami-location="catalog_grid"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M14 4h6v6" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M10 14 20 4" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M20 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4" />
            </svg>
            GitHub
          </a>
        </div>
      </div>
    </div>
  `;

  return article;
}

function debounce<T extends (...args: unknown[]) => void>(callback: T, delayMs: number): T {
  let timeoutId: number | undefined;

  return ((...args: Parameters<T>) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => callback(...args), delayMs);
  }) as T;
}

async function loadCatalogData(dataUrl?: string): Promise<CatalogItem[]> {
  const inlineData = document.getElementById('hacsData')?.textContent?.trim();
  if (inlineData) {
    return JSON.parse(inlineData) as CatalogItem[];
  }

  if (!dataUrl) {
    return [];
  }

  const response = await fetch(dataUrl, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`Catalog fetch failed with status ${response.status}`);
  }

  return (await response.json()) as CatalogItem[];
}

function emptyStateActionLabel(action: EmptyStateAction): string {
  if (action === 'clear-updated') return 'Remove updated filter';
  if (action === 'lower-confidence') return 'Lower confidence threshold';
  if (action === 'disable-featured') return 'Show non-featured integrations';
  return 'Reset all filters';
}

export async function initCatalog(options: { pageSize?: number; dataUrl?: string } = {}) {
  const pageSize = options.pageSize ?? 24;
  const searchInput = document.getElementById('searchInput') as HTMLInputElement;
  const categorySelect = document.getElementById('categorySelect') as HTMLSelectElement;
  const starsSelect = document.getElementById('starsSelect') as HTMLSelectElement;
  const updatedSelect = document.getElementById('updatedSelect') as HTMLSelectElement;
  const confidenceSelect = document.getElementById('confidenceSelect') as HTMLSelectElement;
  const sortSelect = document.getElementById('sortSelect') as HTMLSelectElement;
  const featuredOnly = document.getElementById('featuredOnly') as HTMLInputElement;

  const grid = document.getElementById('integrationsGrid') as HTMLDivElement;
  const emptyState = document.getElementById('emptyState') as HTMLDivElement;
  const emptyStateMessage = document.getElementById('emptyStateMessage') as HTMLParagraphElement;
  const emptyStateActions = document.getElementById('emptyStateActions') as HTMLDivElement;
  const activeFilterChips = document.getElementById('activeFilterChips') as HTMLDivElement;
  const resultsSummary = document.getElementById('resultsSummary') as HTMLParagraphElement;
  const loadMoreButton = document.getElementById('loadMoreButton') as HTMLButtonElement;
  const resetFiltersButton = document.getElementById('resetFilters') as HTMLButtonElement;
  const presetButtons = [...document.querySelectorAll('[data-preset]')] as HTMLButtonElement[];
  const compareBar = document.getElementById('compareBar') as HTMLDivElement;
  const compareSummary = document.getElementById('compareSummary') as HTMLParagraphElement;
  const compareSelectedPills = document.getElementById('compareSelectedPills') as HTMLDivElement;
  const openCompareButton = document.getElementById('openCompareButton') as HTMLButtonElement;
  const clearCompareButton = document.getElementById('clearCompareButton') as HTMLButtonElement;
  const compareDialog = document.getElementById('compareDialog') as HTMLDialogElement;
  const compareResults = document.getElementById('compareResults') as HTMLDivElement;
  const shareCompareButton = document.getElementById('shareCompareButton') as HTMLButtonElement;
  const compareShareStatus = document.getElementById('compareShareStatus') as HTMLParagraphElement;
  const advancedFilters = document.getElementById('advancedFilters') as HTMLDetailsElement | null;
  const categories = [...categorySelect.options].map((option) => option.value).filter((value) => value !== 'all');
  const dateFormatter = new Intl.DateTimeFormat('en', { year: 'numeric', month: 'short', day: '2-digit' });

  let allIntegrations: CatalogItem[] = [];
  let bySlug = new Map<string, CatalogItem>();
  let state = queryToState(window.location.search, categories);
  const readCompareSlugsFromUrl = () =>
    queryValueToCompareSlugs(
      new URLSearchParams(window.location.search.startsWith('?') ? window.location.search.slice(1) : window.location.search).get(
        'compare'
      )
    );
  let requestedCompareSlugs = readCompareSlugsFromUrl();
  let hasTrackedSharedVisit = false;
  let visibleLimit = pageSize;
  let requestId = 0;
  const selectedSlugs = new Set<string>();
  const compareOrder: string[] = [];

  if (advancedFilters && typeof window.matchMedia === 'function') {
    advancedFilters.open = window.matchMedia('(min-width: 1024px)').matches;
  }

  setControlValues(state);
  renderSkeleton(Math.min(pageSize, 8));
  grid.setAttribute('aria-busy', 'true');
  activeFilterChips.hidden = true;
  resultsSummary.textContent = 'Loading catalog...';

  try {
    allIntegrations = await loadCatalogData(options.dataUrl);
    bySlug = new Map(allIntegrations.map((item) => [item.slug, item]));
    track('catalog_loaded', { total_items: allIntegrations.length });
  } catch {
    resultsSummary.textContent = 'Unable to load catalog data.';
    emptyState.hidden = false;
    emptyStateMessage.textContent = 'Catalog temporarily unavailable.';
    emptyStateActions.innerHTML = '';
    activeFilterChips.hidden = true;
    grid.replaceChildren();
    loadMoreButton.hidden = true;
    grid.setAttribute('aria-busy', 'false');
    return;
  }

  const worker =
    typeof Worker !== 'undefined'
      ? new Worker(new URL('./catalog.worker.ts', import.meta.url), { type: 'module' })
      : null;

  if (worker) {
    worker.postMessage({ type: 'init', items: allIntegrations });
  }

  function updateUrl() {
    const params = new URLSearchParams(stateToQuery(state));
    const compareValue = compareSlugsToQueryValue(compareOrder.filter((slug) => selectedSlugs.has(slug)));
    if (compareValue) {
      params.set('compare', compareValue);
    } else {
      params.delete('compare');
    }
    const query = params.toString();
    const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState({}, '', nextUrl);
  }

  function readStateFromControls() {
    state = {
      q: searchInput.value.trim(),
      category: categorySelect.value,
      stars: Number(starsSelect.value),
      updated: Number(updatedSelect.value),
      confidence: Number(confidenceSelect.value),
      sort: sortSelect.value as CatalogState['sort'],
      featured: featuredOnly.checked
    };
  }

  function renderComparePanel() {
    const selected = compareOrder.filter((slug) => selectedSlugs.has(slug));
    const count = selected.length;
    compareBar.classList.toggle('hidden', count === 0);
    compareSummary.textContent = `${count} selected for comparison`;
    openCompareButton.disabled = count < 2;
    openCompareButton.textContent = count >= 2 ? `Compare (${count})` : 'Compare';

    compareSelectedPills.innerHTML = selected
      .map((slug) => bySlug.get(slug))
      .filter((item): item is CatalogItem => Boolean(item))
      .map(
        (item) => `
          <button type="button" class="badge badge-outline gap-1 px-2 py-2" data-compare-remove="${escapeHtml(item.slug)}" aria-label="Remove ${escapeHtml(item.name)} from compare">
            ${escapeHtml(item.name)}
            <span aria-hidden="true">x</span>
          </button>
        `
      )
      .join('');
  }

  function clearShareStatus() {
    compareShareStatus.textContent = '';
  }

  function renderActiveFilterChips() {
    const chips = buildActiveFilterChips(state);
    activeFilterChips.hidden = chips.length === 0;
    activeFilterChips.innerHTML = chips
      .map(
        (chip) => `
          <button type="button" class="badge badge-outline gap-1.5 px-2.5 py-2" data-filter-clear="${escapeHtml(chip.key)}" aria-label="Remove ${escapeHtml(chip.label)} filter">
            ${escapeHtml(chip.label)}
            <span aria-hidden="true">x</span>
          </button>
        `
      )
      .join('');
  }

  function renderEmptyState(total: number) {
    if (total > 0) {
      emptyState.hidden = true;
      emptyStateMessage.textContent = 'No integrations match your filters.';
      emptyStateActions.innerHTML = '';
      return;
    }

    const actions = getEmptyStateActions(state);
    emptyState.hidden = false;
    emptyStateMessage.textContent = 'No integrations match your current filters.';
    emptyStateActions.innerHTML = actions
      .map((action) => {
        const className = action === 'reset-all' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-outline';
        return `<button type="button" class="${className}" data-empty-action="${action}">${escapeHtml(emptyStateActionLabel(action))}</button>`;
      })
      .join('');
  }

  function applySharedCompareSelection() {
    if (requestedCompareSlugs.length === 0) return;

    for (const slug of requestedCompareSlugs) {
      if (!bySlug.has(slug)) continue;
      if (selectedSlugs.has(slug)) continue;
      selectedSlugs.add(slug);
      compareOrder.push(slug);
      if (selectedSlugs.size >= 3) break;
    }

    const validCount = selectedSlugs.size;
    if (validCount >= 2) {
      if (!hasTrackedSharedVisit) {
        track('catalog_compare_shared_visit', { selected_count: validCount });
        hasTrackedSharedVisit = true;
      }
      renderCompareResults();
      if (!compareDialog.open) {
        compareDialog.showModal();
      }
    }
  }

  function renderCompareResults() {
    const selected = compareOrder
      .filter((slug) => selectedSlugs.has(slug))
      .map((slug) => bySlug.get(slug))
      .filter((item): item is CatalogItem => Boolean(item));

    compareResults.innerHTML = selected
      .map((item) => {
        const updatedLabel = item.updatedAt ? dateFormatter.format(new Date(item.updatedAt)) : 'Unknown';
        const confidence = Number(item.scoreConfidence ?? item.recommendedScore).toFixed(1);
        const score = Number(item.recommendedScore).toFixed(1);
        const maintenance = Math.round(maintenanceSignal(item.openIssues, item.stars) * 1000) / 10;
        const scoreBar = Math.max(0, Math.min(100, Number(item.recommendedScore)));
        const confidenceBar = Math.max(0, Math.min(100, Number(item.scoreConfidence ?? item.recommendedScore)));
        const maintenanceBar = Math.max(0, Math.min(100, maintenance));

        return `
          <article class="rounded-2xl border border-base-300/70 bg-base-100/70 p-4">
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div>
                <a
                  href="${escapeHtml(item.detailsPath)}"
                  class="link link-hover text-base font-semibold"
                  data-umami-event="catalog_compare_open_score_profile"
                  data-umami-slug="${escapeHtml(item.slug)}"
                  data-umami-category="${escapeHtml(item.category)}"
                  data-umami-location="compare_dialog"
                >${escapeHtml(item.name)}</a>
                <p class="text-xs text-base-content/65">${escapeHtml(item.repo)}</p>
              </div>
              <div class="flex flex-wrap gap-1.5 text-xs">
                <span class="badge badge-accent badge-outline">Score ${score}</span>
                <span class="badge badge-success badge-outline">Confidence ${confidence}</span>
              </div>
            </div>

            <div class="mt-3 space-y-2">
              <div>
                <div class="mb-1 flex items-center justify-between text-xs">
                  <span>Score</span>
                  <span>${score}</span>
                </div>
                <div class="h-2 rounded-full bg-base-300/50">
                  <div class="h-2 rounded-full bg-accent" style="width:${scoreBar}%"></div>
                </div>
              </div>
              <div>
                <div class="mb-1 flex items-center justify-between text-xs">
                  <span>Confidence</span>
                  <span>${confidence}</span>
                </div>
                <div class="h-2 rounded-full bg-base-300/50">
                  <div class="h-2 rounded-full bg-success" style="width:${confidenceBar}%"></div>
                </div>
              </div>
              <div>
                <div class="mb-1 flex items-center justify-between text-xs">
                  <span>Maintenance health</span>
                  <span>${maintenance}</span>
                </div>
                <div class="h-2 rounded-full bg-base-300/50">
                  <div class="h-2 rounded-full bg-info" style="width:${maintenanceBar}%"></div>
                </div>
              </div>
            </div>

            <div class="mt-3 grid grid-cols-1 gap-2 text-xs text-base-content/75 sm:grid-cols-3">
              <div class="rounded-lg bg-base-200/60 p-2">
                <p class="uppercase tracking-wide text-[10px] text-base-content/55">Stars</p>
                <p class="mt-1 font-semibold">${item.stars.toLocaleString('en-US')}</p>
              </div>
              <div class="rounded-lg bg-base-200/60 p-2">
                <p class="uppercase tracking-wide text-[10px] text-base-content/55">Issues</p>
                <p class="mt-1 font-semibold">${item.openIssues}</p>
              </div>
              <div class="rounded-lg bg-base-200/60 p-2">
                <p class="uppercase tracking-wide text-[10px] text-base-content/55">Updated</p>
                <p class="mt-1 font-semibold">${escapeHtml(updatedLabel)}</p>
              </div>
            </div>
          </article>
        `;
      })
      .join('');
  }

  function renderSkeleton(total = 12) {
    grid.replaceChildren(...Array.from({ length: total }, () => createSkeletonCard()));
  }

  function renderResult(payload: { total: number; visible: CatalogItem[] }) {
    grid.replaceChildren(...payload.visible.map((item) => createCard(item, dateFormatter, selectedSlugs.has(item.slug))));

    renderEmptyState(payload.total);
    loadMoreButton.hidden = payload.total <= payload.visible.length;

    const suffix = payload.total !== payload.visible.length ? ` (showing first ${payload.visible.length})` : '';
    resultsSummary.textContent = `${payload.total.toLocaleString('en-US')} scored integration${payload.total === 1 ? '' : 's'} matched${suffix}`;
    grid.setAttribute('aria-busy', 'false');
    renderActiveFilterChips();
    renderComparePanel();
  }

  function renderCatalog(resetPage = true) {
    if (resetPage) {
      visibleLimit = pageSize;
    }

    readStateFromControls();
    updateUrl();

    grid.setAttribute('aria-busy', 'true');
    renderSkeleton(Math.min(visibleLimit, 12));

    requestId += 1;
    const currentRequest = requestId;

    if (worker) {
      worker.postMessage({
        type: 'query',
        requestId: currentRequest,
        state,
        visibleLimit,
        now: Date.now()
      });
      return;
    }

    // Fallback without Worker (should be rare).
    const filtered = sortRows(filterRows(allIntegrations, state), state.sort);
    renderResult({ total: filtered.length, visible: filtered.slice(0, visibleLimit) });
  }

  if (worker) {
    worker.addEventListener('message', (event: MessageEvent<WorkerResult>) => {
      const payload = event.data;
      if (payload.type !== 'result' || payload.requestId !== requestId) {
        return;
      }

      renderResult(payload);
    });
  }

  [searchInput, categorySelect, starsSelect, updatedSelect, confidenceSelect, sortSelect, featuredOnly].forEach((input) => {
    input.addEventListener('change', () => {
      const changedField = input.id || input.name || 'unknown';
      const payload: TrackPayload = { changed_field: changedField };
      if (input === categorySelect) {
        payload.category_scope = categorySelect.value === 'all' ? 'all' : 'specific';
      } else if (input === starsSelect || input === updatedSelect || input === confidenceSelect || input === sortSelect) {
        payload.selected = (input as HTMLSelectElement).value;
      } else if (input === featuredOnly) {
        payload.enabled = featuredOnly.checked;
      }
      track('catalog_filter_changed', payload);
      void renderCatalog(true);
    });
  });

  const debouncedSearchRender = debounce(() => {
    const queryLength = searchInput.value.trim().length;
    track('catalog_search_changed', {
      query_length_bucket: queryLength === 0 ? 'empty' : queryLength <= 3 ? '1-3' : queryLength <= 8 ? '4-8' : '9+'
    });
    void renderCatalog(true);
  }, 180);
  searchInput.addEventListener('input', debouncedSearchRender);

  loadMoreButton.addEventListener('click', () => {
    visibleLimit += pageSize;
    track('catalog_load_more', { next_visible_limit: visibleLimit });
    void renderCatalog(false);
  });

  activeFilterChips.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const clearButton = target.closest<HTMLButtonElement>('[data-filter-clear]');
    if (!clearButton) return;

    const key = clearButton.dataset.filterClear as FilterChipKey | undefined;
    if (!key) return;

    state = clearFilter(state, key);
    setControlValues(state);
    track('catalog_filter_chip_cleared', { filter: key });
    void renderCatalog(true);
  });

  emptyStateActions.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const actionButton = target.closest<HTMLButtonElement>('[data-empty-action]');
    if (!actionButton) return;

    const action = actionButton.dataset.emptyAction as EmptyStateAction | undefined;
    if (!action) return;

    state = applyEmptyStateAction(state, action);
    setControlValues(state);
    track('catalog_empty_state_action', { action });
    void renderCatalog(true);
  });

  grid.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const compareButton = target.closest<HTMLButtonElement>('[data-compare-toggle]');
    if (!compareButton) return;

    const slug = compareButton.dataset.slug;
    if (!slug) return;

    if (selectedSlugs.has(slug)) {
      selectedSlugs.delete(slug);
      const index = compareOrder.indexOf(slug);
      if (index >= 0) compareOrder.splice(index, 1);
      clearShareStatus();
      track('catalog_compare_remove', { slug, selected_count: selectedSlugs.size });
    } else {
      if (selectedSlugs.size >= 3) {
        const oldest = compareOrder.shift();
        if (oldest) selectedSlugs.delete(oldest);
      }
      selectedSlugs.add(slug);
      compareOrder.push(slug);
      clearShareStatus();
      track('catalog_compare_add', { slug, selected_count: selectedSlugs.size });
    }

    renderComparePanel();
    void renderCatalog(false);
  });

  compareSelectedPills.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const removeButton = target.closest<HTMLButtonElement>('[data-compare-remove]');
    if (!removeButton) return;
    const slug = removeButton.dataset.compareRemove;
    if (!slug) return;

    selectedSlugs.delete(slug);
    const idx = compareOrder.indexOf(slug);
    if (idx >= 0) compareOrder.splice(idx, 1);
    clearShareStatus();
    track('catalog_compare_remove', { slug, selected_count: selectedSlugs.size });
    renderComparePanel();
    void renderCatalog(false);
  });

  openCompareButton.addEventListener('click', () => {
    track('catalog_compare_open', { selected_count: selectedSlugs.size });
    renderCompareResults();
    if (!compareDialog.open) {
      compareDialog.showModal();
    }
  });

  clearCompareButton.addEventListener('click', () => {
    const previousCount = selectedSlugs.size;
    selectedSlugs.clear();
    compareOrder.splice(0, compareOrder.length);
    clearShareStatus();
    track('catalog_compare_clear', { previous_count: previousCount });
    renderComparePanel();
    void renderCatalog(false);
  });

  shareCompareButton.addEventListener('click', async () => {
    const selectedCount = selectedSlugs.size;
    if (selectedCount < 2) {
      compareShareStatus.textContent = 'Select at least two integrations to share this comparison.';
      return;
    }

    updateUrl();
    const shareUrl = window.location.href;

    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
      compareShareStatus.textContent = 'Copy is not available in this browser.';
      track('catalog_compare_share_clicked', { selected_count: selectedCount, copy_success: false, method: 'clipboard_api_missing' });
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      compareShareStatus.textContent = 'Share link copied.';
      track('catalog_compare_share_clicked', { selected_count: selectedCount, copy_success: true, method: 'clipboard_api' });
    } catch {
      compareShareStatus.textContent = 'Unable to copy link. Copy the URL from your browser.';
      track('catalog_compare_share_clicked', { selected_count: selectedCount, copy_success: false, method: 'clipboard_api' });
    }
  });

  resetFiltersButton.addEventListener('click', () => {
    state = { ...DEFAULT_STATE };
    setControlValues(state);
    track('catalog_reset_filters');
    void renderCatalog(false);
  });

  presetButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const preset = button.dataset.preset || 'reset';
      state = applyPreset(preset);
      setControlValues(state);
      track('catalog_preset_applied', { preset });
      void renderCatalog(false);
    });
  });

  window.addEventListener('popstate', () => {
    state = queryToState(window.location.search, categories);
    requestedCompareSlugs = readCompareSlugsFromUrl();
    setControlValues(state);
    applySharedCompareSelection();
    void renderCatalog(false);
  });
  window.addEventListener(
    'pagehide',
    () => {
      worker?.terminate();
    },
    { once: true }
  );

  applySharedCompareSelection();
  renderComparePanel();
  void renderCatalog(false);
}
