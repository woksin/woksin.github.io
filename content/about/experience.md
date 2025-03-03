---
# An instance of the Experience widget.
# Documentation: https://wowchemy.com/docs/page-builder/
widget: experience

# This file represents a page section.
headless: true

# Order that this section appears on the page.
weight: 20

title: Experience
subtitle:

# Date format for experience
#   Refer to https://wowchemy.com/docs/customization/#date-format
date_format: Jan 2006

# Experiences.
#   Add/remove as many `experience` items below as you like.
#   Required fields are `title`, `company`, and `date_start`.
#   Leave `date_end` empty if it's your current employer.
#   Begin multi-line descriptions with YAML's `|2-` multi-line prefix.
experience:
  - title: Tech Lead
    company: Kongsberg Digital - Maritime Simulations
    company_url: 'https://www.kongsbergdigital.com/marsim'
    company_logo: org_kongsberg
    location: Horten, Norway
    date_start: '2024-06-01'
    date_end:
    description: |2-
        At Kongsberg Digital, I work on the development of a security-critical solution providing RBAC functionality on top of our simulation system. This project is a greenfield initiative, introducing modern software design and architecture that is completely new to the team. As a key contributor, I help guide the adoption of these new ways of working, ensuring a robust and scalable foundation. Additionally, I contribute to Chronicle, an open-source event sourcing engine/event store, which serves as the core of our system’s architecture.
        
        **Skills**: C#, .NET, Event Modeling, Event Sourcing, Microservices, Actor Systems, Microsoft Aspire, Software Architecture, Open Source, Hybrid Deployment

  - title: Senior Systems Developer
    company: Stacc
    company_url: 'https://stacc.com'
    company_logo: org_stacc
    location: Oslo, Norway
    date_start: '2023-08-01'
    date_end: '2024-06-01'
    description: |2-
        Worked in a medium-sized team spanning Oslo and Serbia, developing solutions for banking and financial institutions using .NET, TypeScript, React, and Azure. Modernized and stabilized a legacy application, initiating a revival effort with modern capabilities for improved quality, flexibility, and maintainability. Established CI/CD workflows to automate releases, testing pipelines, and code health metrics tracking for test coverage and security vulnerability reporting. Initiated conversations about shifting towards modern cloud-based microservices and multi-tenant SaaS solutions, while also deepening team expertise in distributed systems and event-driven architecture.

        **Skills**: C#, .NET, TypeScript, React, Azure, Event-Driven Architecture, Event Sourcing,  CI/CD, Microservices, Distributed Systems, Agile, SaaS, Financial Technology, SQL, Entity Framework
  
  - title: Software Engineer
    company: DNV - Veracity
    company_url: 'https://veracity.com'
    company_logo: org_dnv
    location: Høvik, Norway
    date_start: '2023-03-01'
    date_end: '2023-08-01'
    description: |2-
        Worked in a large, international team on an event-driven microservices data platform using .NET, TypeScript React, and Azure services. Played a role in standardizing and optimizing development tools and processes, improving developer experience. Created reusable .NET software libraries, accelerating project deliveries across DNV’s software division.

        **Skills**: .NET, Azure, Event-Driven Architecture, Microservices, Agile, DevOps, Scrum

  - title: OSS Platform Engineer
    company: Aigonix (formerly Dolittle)
    company_url: 'https://aigonix.com'
    company_logo: org_aigonix
    location: Oslo, Norway
    date_start: '2018-07-01'
    date_end: '2023-03-01'
    description: |2-
        Being a part of a startup organization from nearly the beginning getting involved in many different aspects of building a SaaS company from the ground up with focus on the core product offering.
        
        Designed and developed a multi-tenant event sourcing engine using .NET, actor framework for high-performance processing, MongoDB for event storage, and gRPC for api-surface. Managed SLA-bound hosting platforms across Azure Kubernetes (AKS) and provided customer support. Contributed to DevOps culture transformation, automating CI/CD workflows with GitHub Actions, reducing deployment friction, and improving service reliability.

        **Skills**: .NET, ASP.NET Core, Actor Frameworks, MongoDB, gRPC, SaaS, Kubernetes, API Design, DevEx, Event Storming, Product Design, Go, Azure, Event Sourcing, Microservices, CI/CD, DevOps, Distributed Systems, Startups, JavaScript, TypeScript, React, GitHub Actions, Azure pipelines, Domain-Driven Design, Kanban
  
  - title: Software Development Consultant
    company: Norwegian Red Cross
    company_url: 'https://www.rodekors.no/en/'
    company_logo: org_redcross
    location: Oslo, Norway
    date_start: '2018-04-01'
    date_end: '2018-06-01'
    description: |2-
        Worked full-time contract on the Community-Based Surveillance (CBS) humanitarian aid project, promoting a DevOps-first culture by automating code integration, deployment, and testing using DevOps Pipelines and Docker. Applied event sourcing, CQRS, and Domain-Driven Design (DDD) principles while working closely with domain experts and volunteer developers.

        **Skills**: C#, .NET, Angular 5, TypeScript, Event Sourcing, CQRS, Domain-Driven Design, DevOps, Docker, Agile, Open-Source

  - title: IT Analyst
    company: Nordkinn Asset Management
    company_url: 'https://nordkinn.se'
    company_logo: org_nordkinn
    location: Oslo, Norway
    date_start: '2018-03-01'
    date_end: '2018-06-01'
    description: |2-
        As a full-stack developer, I worked on database and application development using the .NET ecosystem, SQL, and Entity Framework, with an Angular 5 frontend built in TypeScript. I played a key role in refactoring the codebase, implementing SOLID principles and reducing technical debt by enhancing low coupling and high cohesion. Additionally, I introduced Swagger documentation for REST interfaces and dependency injection tools to improve code maintainability and readability.

        **Skills**: .NET, SQL, Entity Framework, Angular 5, TypeScript, SOLID Principles, Swagger, Dependency Injection, Full-Stack Development
    
  - title: Digital Volunteer Project - Software Development Core Team
    company: Norwegian Red Cross
    company_url: 'https://www.cbsrc.org'
    company_logo: org_redcross
    location: Oslo, Norway
    date_start: '2018-02-01'
    date_end: '2020-12-01'
    description: |2-
        As a full-stack developer on an open-source project, I contributed to an event-sourced microservices architecture that played a role in saving human lives through innovative software and hardware solutions. I actively participated in codeathons, eventually joining the Core Tech Team to oversee progress and ensure effective contributions. My work included backend development with C#, MongoDB, and Event Sourcing, leading a major database refactoring project that improved performance and playing a crucial role in data flow design. On the frontend, I worked with AngularJS and TypeScript, participating in event storming sessions to refine the application’s domain and bounded contexts.

        **Skills**: C#, MongoDB, Event Sourcing, Event-Driven Architecture, CQRS, Domain-Driven Design, Angular 5, TypeScript, Agile

design:
  columns: '1'
---
