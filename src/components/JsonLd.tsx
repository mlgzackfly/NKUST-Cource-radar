// JSON-LD 結構化資料組件
// 用於 SEO，幫助搜尋引擎理解頁面內容

type CourseJsonLdProps = {
  name: string;
  description?: string;
  instructor?: string;
  provider: string;
  url: string;
  credits?: number | null;
  aggregateRating?: {
    ratingValue: number;
    ratingCount: number;
    bestRating?: number;
    worstRating?: number;
  } | null;
};

export function CourseJsonLd({
  name,
  description,
  instructor,
  provider,
  url,
  credits,
  aggregateRating,
}: CourseJsonLdProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name,
    description: description || `${name} - ${provider} 課程`,
    provider: {
      "@type": "Organization",
      name: provider,
      sameAs: "https://www.nkust.edu.tw/",
    },
    ...(instructor && {
      instructor: {
        "@type": "Person",
        name: instructor,
      },
    }),
    ...(credits && {
      numberOfCredits: credits,
    }),
    ...(aggregateRating &&
      aggregateRating.ratingCount > 0 && {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: aggregateRating.ratingValue.toFixed(1),
          ratingCount: aggregateRating.ratingCount,
          bestRating: aggregateRating.bestRating ?? 5,
          worstRating: aggregateRating.worstRating ?? 1,
        },
      }),
    url,
    inLanguage: "zh-TW",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

type WebsiteJsonLdProps = {
  name: string;
  description: string;
  url: string;
};

export function WebsiteJsonLd({ name, description, url }: WebsiteJsonLdProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    description,
    url,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${url}/courses?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    inLanguage: "zh-TW",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

type BreadcrumbJsonLdProps = {
  items: Array<{
    name: string;
    url: string;
  }>;
};

export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

type OrganizationJsonLdProps = {
  name: string;
  url: string;
  logo?: string;
  description?: string;
};

export function OrganizationJsonLd({ name, url, logo, description }: OrganizationJsonLdProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url,
    ...(logo && { logo }),
    ...(description && { description }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

type CourseListItem = {
  name: string;
  url: string;
  position: number;
};

type CourseListJsonLdProps = {
  items: CourseListItem[];
  name: string;
  description: string;
};

export function CourseListJsonLd({ items, name, description }: CourseListJsonLdProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    description,
    numberOfItems: items.length,
    itemListElement: items.map((item) => ({
      "@type": "ListItem",
      position: item.position,
      url: item.url,
      name: item.name,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

type FAQItem = {
  question: string;
  answer: string;
};

type FAQJsonLdProps = {
  items: FAQItem[];
};

export function FAQJsonLd({ items }: FAQJsonLdProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
