import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil, firstValueFrom } from 'rxjs';
import {
  SectionContentTypeEnum, SectionBlockTypeEnum,
  Section, SectionCreateDto, SectionUpdateDto
} from '../../../../core/interfaces/section.interface';
import {
  INewsBanner, NewsBannerPromoService,
  NewsBannerTypeEnum, IQueryDto
} from '../../../../core/services/news-banner-promo.service';
import { HeaderComponent } from './header/header.component';


export interface TableData {
  headers: string[];
  rows: { cells: string[] }[];
}

// Обновите интерфейс SectionDraft
interface SectionDraft {
  tempId: string;
  position: number;
  contentType: SectionContentTypeEnum;
  blockType: SectionBlockTypeEnum;
  header: string;
  subheader?: string;
  mainText: string;
  newsBannerId: string;
  images: { file: File | null; preview: string; uploadedId?: string }[];
  isEditing?: boolean;
  tableData?: TableData;
}

@Component({
  selector: 'app-articles',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, HeaderComponent],
  templateUrl: './articles.component.html',
  styleUrls: ['./articles.component.scss']
})
export class ArticlesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Всё управление происходит внутри этого компонента: Router не используется
  viewMode: 'list' | 'editor' = 'list';
  articleId: string | null = null;

  articles: INewsBanner[] = [];
  filteredArticles: INewsBanner[] = [];
  searchQuery = '';
  statusFilter: 'all' | 'active' | 'inactive' = 'all';

  article: INewsBanner | null = null;
  sections: Section[] = [];
  sectionDrafts: SectionDraft[] = [];
  activeDraftId: string | null = null;

  isEditingArticleInfo = false;
  articleEditForm = {
    header: '',
    subheader: '',
    description: '',
    content: '',
    beginDateTime: '',
    endDateTime: '',
    link: '',
    keyNames: ''
  };

  isLoading = false;
  isSaving = false;
  showPreview = false;
  previewSection: SectionDraft | null = null;
  activeSectionId: string | null = null;
  showDeleteArticleConfirm = false;

  isNewArticle = false;
  articleImages: { file: File; preview: string }[] = [];

  newSectionForm = {
    contentType: SectionContentTypeEnum.Text,
    blockType: SectionBlockTypeEnum.Standard,
    header: '',
    subheader: '',
    mainText: '',
    images: [] as { file: File; preview: string }[],
    tableData: { headers: ['Заголовок 1', 'Заголовок 2'], rows: [{ cells: ['Данные 1', 'Данные 2'] }] } as TableData // <-- ДОБАВЛЕНО
  };

  tableData: any;
  contentTypes = [
    { value: SectionContentTypeEnum.Text, label: 'Текст', icon: '📝' },
    { value: SectionContentTypeEnum.Table, label: 'Таблица', icon: '📊' },
    { value: SectionContentTypeEnum.Video, label: 'Видео', icon: '🎬' }
  ];

  blockTypes = [
    { value: SectionBlockTypeEnum.Standard, label: 'Стандартный', desc: 'Текст слева, изображение справа' },
    { value: SectionBlockTypeEnum.Extended, label: 'Расширенный', desc: 'Текст справа, изображение слева' },
    { value: SectionBlockTypeEnum.TopImage, label: 'Изображение сверху', desc: 'Картинка сверху, текст снизу' },
    { value: SectionBlockTypeEnum.BottomImage, label: 'Изображение снизу', desc: 'Текст сверху, картинка снизу' }
  ];

  constructor(
    private route: ActivatedRoute,
    private contentService: NewsBannerPromoService
  ) { }

  ngOnInit(): void {
    // Поддерживаем прямое открытие URL, но при обычной работе URL вообще не меняем.
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.openEditor(id);
    } else {
      this.loadArticles();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadArticles(): void {
    this.isLoading = true;
    const query: IQueryDto = {
      filters: [],
      sorts: [{ field: 'beginDateTime', sortType: 1 }],
      page: 0,
      pageSize: 100
    };

    this.contentService.filterNewsBanners(query)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          this.articles = response.data.filter((item: any) =>
            (item.newsBannerType ?? item.NewsBannerType) === NewsBannerTypeEnum.Article
          );
          this.applyArticleFilters();
          this.isLoading = false;
        },
        error: () => {
          this.showNotification('Не удалось загрузить статьи', 'error');
          this.isLoading = false;
        }
      });
  }

  getActiveArticleCount(): number {
    return this.articles.filter(a => this.isActive(a)).length;
  }

  onSearchChange(): void {
    this.applyArticleFilters();
  }

  onStatusFilterChange(): void {
    this.applyArticleFilters();
  }

  private applyArticleFilters(): void {
    const q = this.searchQuery.trim().toLowerCase();
    this.filteredArticles = this.articles.filter(a => {
      const matchesSearch = !q ||
        a.header?.toLowerCase().includes(q) ||
        a.subheader?.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        a.content?.toLowerCase().includes(q) ||
        a.keyNames?.some(k => k.toLowerCase().includes(q));

      const active = this.isActive(a);
      const matchesStatus =
        this.statusFilter === 'all' ||
        (this.statusFilter === 'active' && active) ||
        (this.statusFilter === 'inactive' && !active);

      return matchesSearch && matchesStatus;
    });
  }

  openEditor(articleOrId: INewsBanner | string): void {
    const article = typeof articleOrId === 'string'
      ? this.articles.find(a => a.id === articleOrId)
      : articleOrId;

    const id = typeof articleOrId === 'string' ? articleOrId : articleOrId?.id;
    if (!id || !article) {
      this.showNotification('Не удалось открыть статью: отсутствует ID статьи', 'error');
      return;
    }

    this.articleId = id;
    this.viewMode = 'editor';
    this.article = article;
    this.sections = [];
    this.sectionDrafts = [];
    this.activeDraftId = null;
    this.isEditingArticleInfo = false;
    this.sections = this.article.sections;
    // this.loadSections();
  }

  goBackToList(): void {
    // Никакого перехода на другую страницу — просто переключаем представление.
    this.closeEditorState();
    this.loadArticles();
  }

  private closeEditorState(): void {
    this.viewMode = 'list';
    this.articleId = null;
    this.article = null;
    this.sections = [];
    this.sectionDrafts = [];
    this.activeDraftId = null;
    this.activeSectionId = null;
    this.showPreview = false;
    this.previewSection = null;
  }


  private loadSections(): void {
    if (!this.articleId) return;
    this.contentService.getSectionsByNewsBannerId(this.articleId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: sections => {
          this.sections = [...sections].sort((a, b) => a.position - b.position);
        },
        error: () => this.showNotification('Не удалось загрузить секции', 'error')
      });
  }

  async createNewArticle(): Promise<void> {
    this.article = {
      header: '',
      subheader: '',
      content: '',
      description: '',
      beginDateTime: new Date(),
      endDateTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      NewsBannerType: NewsBannerTypeEnum.Article,
      keyNames: [],
      link: '',
      sections: []
    };

    this.articleId = null;
    this.viewMode = 'editor';
    this.isNewArticle = true;
    this.isEditingArticleInfo = true;
    this.sections = [];
    this.sectionDrafts = [];
    this.articleImages = [];
  }

  duplicateArticleFromList(articleId: string, event?: Event): void {
    event?.stopPropagation();
    const source = this.articles.find(a => a.id === articleId);
    if (!source) return;
    const copy: INewsBanner = { ...source, id: undefined, header: `${source.header} — копия`, keyNames: [...(source.keyNames || [])], sections: [] };
    this.isSaving = true;
    this.contentService.createNewsBanner(copy).pipe(takeUntil(this.destroy$)).subscribe({
      next: response => {
        this.isSaving = false;
        if (response.data.id) this.openEditor(response.data);
        this.showNotification('Копия статьи создана', 'success');
      },
      error: () => { this.isSaving = false; this.showNotification('Не удалось скопировать статью', 'error'); }
    });
  }

  duplicateArticle(event?: Event): void {
    event?.stopPropagation();
    if (!this.article) return;

    const copy: INewsBanner = {
      ...this.article,
      id: undefined,
      header: `${this.article.header} — копия`,
      keyNames: [...(this.article.keyNames || [])],
      sections: []
    };

    this.isSaving = true;
    this.contentService.createNewsBanner(copy)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          this.isSaving = false;
          if (response.data.id) this.openEditor(response.data);
          this.showNotification('Копия статьи создана', 'success');
        },
        error: () => {
          this.isSaving = false;
          this.showNotification('Не удалось скопировать статью', 'error');
        }
      });
  }

  requestDeleteArticle(): void {
    this.showDeleteArticleConfirm = true;
  }

  cancelDeleteArticle(): void {
    this.showDeleteArticleConfirm = false;
  }

  deleteCurrentArticle(): void {
    if (!this.article?.id) return;
    this.isSaving = true;
    this.contentService.deleteNewsBanner(this.article.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSaving = false;
          this.showDeleteArticleConfirm = false;
          this.showNotification('Статья удалена', 'success');
          this.goBackToList();
        },
        error: () => {
          this.isSaving = false;
          this.showNotification('Не удалось удалить статью', 'error');
        }
      });
  }

  deleteArticle(articleId: string, event: Event): void {
    event.stopPropagation();
    if (!confirm('Удалить эту статью?')) return;

    this.contentService.deleteNewsBanner(articleId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.articles = this.articles.filter(a => a.id !== articleId);
          this.applyArticleFilters();
          this.showNotification('Статья удалена', 'success');
        },
        error: () => this.showNotification('Не удалось удалить статью', 'error')
      });
  }

  startEditArticleInfo(): void {
    if (!this.article) return;
    this.articleEditForm = {
      header: this.article.header || '',
      subheader: this.article.subheader || '',
      description: this.article.description || '',
      content: this.article.content || '',
      beginDateTime: this.formatDateForInput(this.article.beginDateTime),
      endDateTime: this.article.endDateTime ? this.formatDateForInput(this.article.endDateTime) : '',
      link: this.article.link || '',
      keyNames: (this.article.keyNames || []).join(', ')
    };
    this.isEditingArticleInfo = true;
  }

  cancelEditArticleInfo(): void {
    this.isEditingArticleInfo = false;
  }

  saveArticleInfo(): void {
    if (!this.article) return;
    if (!this.articleEditForm.header.trim()) {
      this.showNotification('Заголовок статьи обязателен', 'error');
      return;
    }

    this.article.header = this.articleEditForm.header.trim();
    this.article.subheader = this.articleEditForm.subheader.trim();
    this.article.description = this.articleEditForm.description.trim();
    this.article.content = this.articleEditForm.content;
    this.article.beginDateTime = new Date(this.articleEditForm.beginDateTime);
    this.article.link = this.articleEditForm.link.trim();
    this.article.keyNames = this.articleEditForm.keyNames
      .split(',')
      .map(x => x.trim())
      .filter(Boolean);

    this.isEditingArticleInfo = false;
    this.saveArticle();
  }

  async saveArticle(): Promise<void> {
    if (!this.article) return;
    delete this.article.endDateTime;
    if (!this.article.header.trim()) {
      this.showNotification('Заголовок статьи обязателен', 'error');
      return;
    }

    this.isSaving = true;
    const wasNew = this.isNewArticle;

    try {
      // Выбираем метод: создание или обновление
      const response = await firstValueFrom(
        wasNew
          ? this.contentService.createNewsBanner(this.article)
          : this.contentService.updateNewsBanner(this.article.id!, this.article)
      );

      this.article = response.data;
      this.articleId = this.article.id!;

      // Если это была новая статья и пользователь загрузил изображения, загружаем их на сервер
      if (wasNew && this.articleImages.length > 0) {
        this.contentService.uploadNewsBannerImage(this.article, this.articleImages);
        this.articleImages = []; // Очищаем локальный массив после успешной загрузки
      }

      this.isNewArticle = false; // Теперь это существующая статья
      this.showNotification(wasNew ? 'Статья успешно создана' : 'Статья сохранена', 'success');

    } catch (error: any) {
      this.showNotification(error?.error?.message || 'Не удалось сохранить статью', 'error');
    } finally {
      this.isSaving = false;
    }
  }



  onArticleImageSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []).filter(f => f.type.startsWith('image/'));

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e: any) => this.articleImages.push({ file, preview: e.target.result });
      reader.readAsDataURL(file);
    });
    input.value = '';
  }


  addSectionDraft(): void {
    const newsBannerId = this.articleId || this.article?.id;
    if (!newsBannerId) {
      this.showNotification('Сначала сохраните статью, чтобы добавлять секции', 'error');
      return;
    }

    this.articleId = newsBannerId;
    const draft: SectionDraft = {
      tempId: 'draft_' + Date.now(),
      position: this.sections.length + this.sectionDrafts.length,
      contentType: this.newSectionForm.contentType,
      blockType: this.newSectionForm.blockType,
      header: this.newSectionForm.header.trim(),
      subheader: this.newSectionForm.subheader.trim(),
      mainText: this.newSectionForm.mainText,
      newsBannerId: newsBannerId,
      images: this.newSectionForm.images.map(x => ({ ...x })),
      // <-- ДОБАВЛЕНО: копируем данные таблицы, если выбран тип "Таблица"
      tableData: this.newSectionForm.contentType === SectionContentTypeEnum.Table
        ? JSON.parse(JSON.stringify(this.newSectionForm.tableData))
        : undefined,
      isEditing: true
    };

    this.sectionDrafts.push(draft);
    this.activeDraftId = draft.tempId;
    this.previewSection = draft;
    this.showPreview = true;
    this.resetNewSectionForm();
  }

  private resetNewSectionForm(): void {
    this.newSectionForm = {
      contentType: SectionContentTypeEnum.Text,
      blockType: SectionBlockTypeEnum.Standard,
      header: '',
      subheader: '',
      mainText: '',
      images: [],
      tableData: { headers: ['Заголовок 1', 'Заголовок 2'], rows: [{ cells: ['Данные 1', 'Данные 2'] }] } // <-- ДОБАВЛЕНО
    };
  }

  removeDraft(draftId: string): void {
    this.sectionDrafts = this.sectionDrafts.filter(d => d.tempId !== draftId);
    if (this.activeDraftId === draftId) {
      this.activeDraftId = null;
      this.previewSection = null;
      this.showPreview = false;
    }
  }

  editDraft(draft: SectionDraft): void {
    draft.isEditing = true;
    this.activeDraftId = draft.tempId;
    this.previewSection = draft;
    this.showPreview = true;
  }

  toggleDraft(draft: SectionDraft): void {
    draft.isEditing = !draft.isEditing;
    this.activeDraftId = draft.isEditing ? draft.tempId : null;
    this.previewSection = draft.isEditing ? draft : null;
    this.showPreview = draft.isEditing;
  }

  onNewSectionImageSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []).filter(f => f.type.startsWith('image/'));
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e: any) => this.newSectionForm.images.push({ file, preview: e.target.result });
      reader.readAsDataURL(file);
    });
    input.value = '';
  }

  onSectionImageSelect(event: Event, draftId: string): void {
    const input = event.target as HTMLInputElement;
    const draft = this.sectionDrafts.find(d => d.tempId === draftId);
    if (!draft) return;

    Array.from(input.files || []).filter(f => f.type.startsWith('image/')).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e: any) => draft.images.push({ file, preview: e.target.result });
      reader.readAsDataURL(file);
    });
    input.value = '';
  }

  removeDraftImage(draft: SectionDraft, index: number): void {
    draft.images.splice(index, 1);
  }

  previewSectionDraft(draft: SectionDraft): void {
    draft.isEditing = true;
    this.activeDraftId = draft.tempId;
    // Используем тот же объект, что и форма: preview обновляется в реальном времени.
    this.previewSection = draft;
    this.showPreview = true;
  }

  getLivePreviewSections(): any[] {
    const result: any[] = this.sections.map(section => {
      const draft = this.sectionDrafts.find(d => d.tempId === 'edit_' + section.id);
      return draft || section;
    });

    result.push(...this.sectionDrafts.filter(d => !d.tempId.startsWith('edit_')));
    return result.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }

  isPreviewSectionActive(item: any, draft: SectionDraft): boolean {
    return item === draft || !!(item?.id && draft.tempId === 'edit_' + item.id);
  }

  selectPreviewSection(item: any): void {
    let draft: SectionDraft | undefined;

    if (item?.tempId) {
      draft = item as SectionDraft;
    } else if (item?.id) {
      draft = this.sectionDrafts.find(d => d.tempId === 'edit_' + item.id);
      if (!draft) {
        this.editSection(item as Section);
        draft = this.sectionDrafts.find(d => d.tempId === 'edit_' + item.id);
      }
    }

    if (draft) {
      draft.isEditing = true;
      this.activeDraftId = draft.tempId;
      this.previewSection = draft;
      this.showPreview = true;
    }
  }

  closePreview(): void {
    this.showPreview = false;
    this.previewSection = null;
  }

  async saveSectionDraft(draft: SectionDraft, originalSection?: Section): Promise<void> {
    if (!this.articleId) return;
    this.isSaving = true;

    try {
      if (draft.contentType === SectionContentTypeEnum.Table && draft.tableData) {
        draft.mainText = JSON.stringify(draft.tableData);
      }

      if (originalSection?.id) {
        const updateDto: SectionUpdateDto = {
          id: originalSection.id,
          position: draft.position,
          contentType: draft.contentType,
          blockType: draft.blockType,
          header: draft.header,
          subheader: draft.subheader,
          mainText: draft.mainText,
          newsBannerId: draft.newsBannerId,
          removeOldImages: true
        };

        const updated = await firstValueFrom(
          this.contentService.updateSection(originalSection.id, updateDto)
        );


        const newImages = draft.images.filter(
          img => !img.uploadedId && img.file
        );

        for (const img of newImages) {
          await firstValueFrom(
            this.contentService.uploadSectionImage(
              originalSection.id,
              img.file!
            )
          );
        }


        const index = this.sections.findIndex(s => s.id === originalSection.id);
        if (index !== -1) this.sections[index] = updated.data;
        this.sections.sort((a, b) => a.position - b.position);
        this.removeDraft(draft.tempId);
        this.showNotification('Секция обновлена', 'success');
      } else {
        const createDto: SectionCreateDto = {
          position: draft.position,
          contentType: draft.contentType,
          blockType: draft.blockType,
          header: draft.header,
          subheader: draft.subheader,
          mainText: draft.mainText,
          newsBannerId: draft.newsBannerId
        };

        const created = await firstValueFrom(
          this.contentService.createSection(createDto)
        );

        const sectionId = created.data.id;

        if (!sectionId) {
          throw new Error('Backend не вернул ID созданной секции');
        }

        if (draft.images.length) {
          const uploadedIds: string[] = [];
          console.log('draft.images', draft.images)
          for (const img of draft.images) {
            if (!img.file) continue;

            const uploaded = await firstValueFrom(
              this.contentService.uploadSectionImage(sectionId, img.file)
            );

            uploadedIds.push(uploaded.id);
          }

          if (uploadedIds.length) {
            const imageResponse = await firstValueFrom(
              this.contentService.updateSectionImages(sectionId, uploadedIds)
            );

            if (imageResponse?.data) {
              created.data = imageResponse.data;
            }
          }
        }

        this.sections.push(created.data);
        this.sections.sort((a, b) => a.position - b.position);

        this.removeDraft(draft.tempId);
        this.showNotification('Секция сохранена', 'success');
      }
    } catch (error: any) {
      this.showNotification(error?.error?.message || 'Не удалось сохранить секцию', 'error');
    } finally {
      this.isSaving = false;
    }
  }

  editSection(section: Section): void {
    if (this.isSectionBeingEdited(section.id!)) return;

    let tableData: TableData | undefined = undefined;

    // Пытаемся восстановить данные таблицы из mainText
    if (section.contentType === SectionContentTypeEnum.Table && section.mainText) {
      try {
        tableData = JSON.parse(section.mainText);
      } catch (e) {
        // Если JSON битый, создаем пустую таблицу
        tableData = { headers: ['Заголовок 1'], rows: [{ cells: [''] }] };
      }
    }

    const draft: SectionDraft = {
      tempId: 'edit_' + section.id,
      position: section.position,
      contentType: section.contentType,
      blockType: section.blockType,
      header: section.header || '',
      subheader: section.subheader || '',
      mainText: section.mainText || '',
      newsBannerId: section.newsBannerId,
      tableData: tableData, // <-- ДОБАВЛЕНО
      images: (section.imageInstanceLinks || []).map(link => ({
        file: null,
        preview: link,
        uploadedId: link.split('/').pop()
      })),
      isEditing: true
    };

    this.sectionDrafts.push(draft);
    this.activeDraftId = draft.tempId;
    this.previewSection = draft;
    this.showPreview = true;
  }


  getOriginalSection(draft: SectionDraft): Section | undefined {
    if (!draft.tempId.startsWith('edit_')) return undefined;
    return this.sections.find(s => s.id === draft.tempId.replace('edit_', ''));
  }

  async saveDraft(draft: SectionDraft): Promise<void> {
    await this.saveSectionDraft(draft, this.getOriginalSection(draft));
  }

  async saveAllDrafts(): Promise<void> {
    if (!this.sectionDrafts.length) return;
    for (const draft of [...this.sectionDrafts]) {
      await this.saveDraft(draft);
    }
  }

  cancelSectionEdit(draft: SectionDraft): void {
    this.removeDraft(draft.tempId);
  }

  deleteSection(sectionId: string): void {
    if (!confirm('Удалить эту секцию?')) return;
    this.contentService.deleteSection(sectionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.sections = this.sections.filter(s => s.id !== sectionId);
          this.sectionDrafts = this.sectionDrafts.filter(d => d.tempId !== 'edit_' + sectionId);
          this.renumberLocalPositions();
          this.showNotification('Секция удалена', 'success');
        },
        error: () => this.showNotification('Не удалось удалить секцию', 'error')
      });
  }

  moveSection(sectionId: string, direction: 'up' | 'down'): void {
    const index = this.sections.findIndex(s => s.id === sectionId);
    if (index < 0) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= this.sections.length) return;

    [this.sections[index].position, this.sections[newIndex].position] =
      [this.sections[newIndex].position, this.sections[index].position];
    [this.sections[index], this.sections[newIndex]] =
      [this.sections[newIndex], this.sections[index]];

    this.persistSectionOrder();
  }

  private renumberLocalPositions(): void {
    this.sections = this.sections
      .sort((a, b) => a.position - b.position)
      .map((s, i) => ({ ...s, position: i }));
    this.persistSectionOrder();
  }

  private persistSectionOrder(): void {
    if (!this.sections.length) return;
    this.contentService.reorderSections(this.sections)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: updated => {
          this.sections = updated.sort((a, b) => a.position - b.position);
          this.showNotification('Порядок секций сохранён', 'success');
        },
        error: () => {
          this.loadSections();
          this.showNotification('Не удалось сохранить порядок', 'error');
        }
      });
  }

  getContentTypeLabel(type: SectionContentTypeEnum): string {
    return this.contentTypes.find(t => t.value === type)?.label || 'Неизвестно';
  }

  getBlockTypeLabel(type: SectionBlockTypeEnum): string {
    return this.blockTypes.find(t => t.value === type)?.label || 'Неизвестно';
  }

  getSectionClass(section: any): string {
    return `block-${section.blockType === 1 ? 'standard' : section.blockType === 2 ? 'extended' : 'fullwidth'}`;
  }

  isActive(article: any): boolean {
    const now = new Date();
    const start = new Date(article.beginDateTime);
    const end = article.endDateTime ? new Date(article.endDateTime) : null;
    return now >= start && (!end || now <= end);
  }

  formatDate(date: any): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  }

  formatDateForInput(date: any): string {
    if (!date) return '';
    const d = new Date(date);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  showNotification(message: string, type: 'success' | 'error' = 'success'): void {
    // Оставляем простую совместимость с текущим UI.
    alert(`${type === 'success' ? '✓' : '✗'} ${message}`);
  }

  isSectionBeingEdited(sectionId: string): boolean {
    return this.sectionDrafts.some(d => d.tempId === 'edit_' + sectionId);
  }

  getPreviewImages(): any[] {
    return this.previewSection?.images || [];
  }

  saveAndClosePreview(): void {
    if (!this.previewSection) return;
    const draft = this.sectionDrafts.find(d => d.tempId === this.previewSection!.tempId);
    if (draft) {
      this.saveDraft(draft);
    }
    this.closePreview();
  }

  hasPreviewImages(): boolean {
    return !!this.previewSection?.images?.length;
  }

  initTableData(draft: SectionDraft): void {
    if (!draft.tableData) {
      draft.tableData = {
        headers: ['Заголовок 1', 'Заголовок 2'],
        rows: [{ cells: ['Данные 1', 'Данные 2'] }]
      };
    }
  }

  addTableRow(draft: SectionDraft): void {
    this.initTableData(draft); // Гарантируем инициализацию
    const newCells = draft.tableData!.headers.map(() => '');
    draft.tableData!.rows.push({ cells: newCells });
  }

  removeTableRow(draft: SectionDraft, rowIndex: number): void {
    if (draft.tableData && draft.tableData.rows.length > 1) {
      draft.tableData.rows.splice(rowIndex, 1);
    }
  }

  addTableColumn(draft: SectionDraft): void {
    this.initTableData(draft); // Гарантируем инициализацию
    draft.tableData!.headers.push(`Заголовок ${draft.tableData!.headers.length + 1}`);
    draft.tableData!.rows.forEach(row => row.cells.push(''));
  }

  removeTableColumn(draft: SectionDraft, colIndex: number): void {
    if (draft.tableData && draft.tableData.headers.length > 1) {
      draft.tableData.headers.splice(colIndex, 1);
      draft.tableData.rows.forEach(row => row.cells.splice(colIndex, 1));
    }
  }

  getTableData(item: any): TableData | null {
    if (item.contentType === SectionContentTypeEnum.Table) {
      // 1. Сначала проверяем tableData (для живых черновиков)
      if (item.tableData) {
        return item.tableData;
      }
      // 2. Иначе пытаемся распарсить mainText (для уже сохраненных секций)
      if (item.mainText) {
        try {
          return JSON.parse(item.mainText);
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  getTableHtml(item: any): string {
    const data = this.getTableData(item);
    if (!data) return '<p class="table-error">Ошибка данных таблицы или она пуста</p>';

    let html = '<table class="preview-article-table"><thead><tr>';
    data.headers.forEach(h => {
      html += `<th>${this.sanitizeHtml(h)}</th>`;
    });
    html += '</tr></thead><tbody>';

    data.rows.forEach((row: any) => {
      html += '<tr>';
      row.cells.forEach((cell: any) => {
        html += `<td>${this.sanitizeHtml(cell)}</td>`;
      });
      html += '</tr>';
    });

    html += '</tbody></table>';
    return html;
  }

  // Простая санитизация для безопасности (можно заменить на DomSanitizer если нужно)
  private sanitizeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  addTableRowToNewForm(): void {
    const newCells = this.newSectionForm.tableData.headers.map(() => '');
    this.newSectionForm.tableData.rows.push({ cells: newCells });
  }

  removeTableRowFromNewForm(rowIndex: number): void {
    if (this.newSectionForm.tableData.rows.length > 1) {
      this.newSectionForm.tableData.rows.splice(rowIndex, 1);
    }
  }

  addTableColumnToNewForm(): void {
    this.newSectionForm.tableData.headers.push(`Заголовок ${this.newSectionForm.tableData.headers.length + 1}`);
    this.newSectionForm.tableData.rows.forEach(row => row.cells.push(''));
  }

  removeTableColumnFromNewForm(colIndex: number): void {
    if (this.newSectionForm.tableData.headers.length > 1) {
      this.newSectionForm.tableData.headers.splice(colIndex, 1);
      this.newSectionForm.tableData.rows.forEach(row => row.cells.splice(colIndex, 1));
    }
  }
}
