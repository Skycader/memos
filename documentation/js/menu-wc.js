'use strict';

customElements.define('compodoc-menu', class extends HTMLElement {
    constructor() {
        super();
        this.isNormalMode = this.getAttribute('mode') === 'normal';
    }

    connectedCallback() {
        this.render(this.isNormalMode);
    }

    render(isNormalMode) {
        let tp = lithtml.html(`
        <nav>
            <ul class="list">
                <li class="title">
                    <a href="index.html" data-type="index-link">memos documentation</a>
                </li>

                <li class="divider"></li>
                ${ isNormalMode ? `<div id="book-search-input" role="search"><input type="text" placeholder="Type to search"></div>` : '' }
                <li class="chapter">
                    <a data-type="chapter-link" href="index.html"><span class="icon ion-ios-home"></span>Getting started</a>
                    <ul class="links">
                        <li class="link">
                            <a href="overview.html" data-type="chapter-link">
                                <span class="icon ion-ios-keypad"></span>Overview
                            </a>
                        </li>
                        <li class="link">
                            <a href="index.html" data-type="chapter-link">
                                <span class="icon ion-ios-paper"></span>README
                            </a>
                        </li>
                                <li class="link">
                                    <a href="dependencies.html" data-type="chapter-link">
                                        <span class="icon ion-ios-list"></span>Dependencies
                                    </a>
                                </li>
                                <li class="link">
                                    <a href="properties.html" data-type="chapter-link">
                                        <span class="icon ion-ios-apps"></span>Properties
                                    </a>
                                </li>
                    </ul>
                </li>
                    <li class="chapter modules">
                        <a data-type="chapter-link" href="modules.html">
                            <div class="menu-toggler linked" data-bs-toggle="collapse" ${ isNormalMode ?
                                'data-bs-target="#modules-links"' : 'data-bs-target="#xs-modules-links"' }>
                                <span class="icon ion-ios-archive"></span>
                                <span class="link-name">Modules</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                        </a>
                        <ul class="links collapse " ${ isNormalMode ? 'id="modules-links"' : 'id="xs-modules-links"' }>
                            <li class="link">
                                <a href="modules/AppModule.html" data-type="entity-link" >AppModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#components-links-module-AppModule-7e565759a8521d10e287498d85f3118fd6d3a5e91087ab919defd54aa49f3f55f15595256c4f56a87d5e879e98e8fa80487fecc6cb3aa95cd396b4fc5fef8cf0"' : 'data-bs-target="#xs-components-links-module-AppModule-7e565759a8521d10e287498d85f3118fd6d3a5e91087ab919defd54aa49f3f55f15595256c4f56a87d5e879e98e8fa80487fecc6cb3aa95cd396b4fc5fef8cf0"' }>
                                            <span class="icon ion-md-cog"></span>
                                            <span>Components</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="components-links-module-AppModule-7e565759a8521d10e287498d85f3118fd6d3a5e91087ab919defd54aa49f3f55f15595256c4f56a87d5e879e98e8fa80487fecc6cb3aa95cd396b4fc5fef8cf0"' :
                                            'id="xs-components-links-module-AppModule-7e565759a8521d10e287498d85f3118fd6d3a5e91087ab919defd54aa49f3f55f15595256c4f56a87d5e879e98e8fa80487fecc6cb3aa95cd396b4fc5fef8cf0"' }>
                                            <li class="link">
                                                <a href="components/AppComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AppComponent</a>
                                            </li>
                                        </ul>
                                    </li>
                            </li>
                            <li class="link">
                                <a href="modules/AppRoutingModule.html" data-type="entity-link" >AppRoutingModule</a>
                            </li>
                            <li class="link">
                                <a href="modules/AppServerModule.html" data-type="entity-link" >AppServerModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#components-links-module-AppServerModule-f9bd8a2e383e1fdb89b720482f275daf4d52b1791e7f4a876525a64e6683f175d787e6648760b5c33b83cc499537f1610a22f454735802bee0d2d5888220fb91"' : 'data-bs-target="#xs-components-links-module-AppServerModule-f9bd8a2e383e1fdb89b720482f275daf4d52b1791e7f4a876525a64e6683f175d787e6648760b5c33b83cc499537f1610a22f454735802bee0d2d5888220fb91"' }>
                                            <span class="icon ion-md-cog"></span>
                                            <span>Components</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="components-links-module-AppServerModule-f9bd8a2e383e1fdb89b720482f275daf4d52b1791e7f4a876525a64e6683f175d787e6648760b5c33b83cc499537f1610a22f454735802bee0d2d5888220fb91"' :
                                            'id="xs-components-links-module-AppServerModule-f9bd8a2e383e1fdb89b720482f275daf4d52b1791e7f4a876525a64e6683f175d787e6648760b5c33b83cc499537f1610a22f454735802bee0d2d5888220fb91"' }>
                                            <li class="link">
                                                <a href="components/AppComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AppComponent</a>
                                            </li>
                                        </ul>
                                    </li>
                            </li>
                            <li class="link">
                                <a href="modules/AppServerModule.html" data-type="entity-link" >AppServerModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#components-links-module-AppServerModule-13b65a05160110360987990df241863edfb7d2e569d67a851edeb9f10a51dc030bc04ec93a614aded8a980778f6aeefa2945f252728bc7bc78d61815ff16c36f-1"' : 'data-bs-target="#xs-components-links-module-AppServerModule-13b65a05160110360987990df241863edfb7d2e569d67a851edeb9f10a51dc030bc04ec93a614aded8a980778f6aeefa2945f252728bc7bc78d61815ff16c36f-1"' }>
                                            <span class="icon ion-md-cog"></span>
                                            <span>Components</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="components-links-module-AppServerModule-13b65a05160110360987990df241863edfb7d2e569d67a851edeb9f10a51dc030bc04ec93a614aded8a980778f6aeefa2945f252728bc7bc78d61815ff16c36f-1"' :
                                            'id="xs-components-links-module-AppServerModule-13b65a05160110360987990df241863edfb7d2e569d67a851edeb9f10a51dc030bc04ec93a614aded8a980778f6aeefa2945f252728bc7bc78d61815ff16c36f-1"' }>
                                            <li class="link">
                                                <a href="components/AppComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AppComponent</a>
                                            </li>
                                        </ul>
                                    </li>
                            </li>
                            <li class="link">
                                <a href="modules/BackupModule.html" data-type="entity-link" >BackupModule</a>
                            </li>
                            <li class="link">
                                <a href="modules/BrowserModule.html" data-type="entity-link" >BrowserModule</a>
                            </li>
                            <li class="link">
                                <a href="modules/CoreModule.html" data-type="entity-link" >CoreModule</a>
                            </li>
                            <li class="link">
                                <a href="modules/DatabaseModule.html" data-type="entity-link" >DatabaseModule</a>
                            </li>
                            <li class="link">
                                <a href="modules/DebugModule.html" data-type="entity-link" >DebugModule</a>
                            </li>
                            <li class="link">
                                <a href="modules/MathModule.html" data-type="entity-link" >MathModule</a>
                            </li>
                            <li class="link">
                                <a href="modules/MenuModule.html" data-type="entity-link" >MenuModule</a>
                            </li>
                            <li class="link">
                                <a href="modules/RepeatModule.html" data-type="entity-link" >RepeatModule</a>
                            </li>
                            <li class="link">
                                <a href="modules/TerminalModule.html" data-type="entity-link" >TerminalModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#components-links-module-TerminalModule-b8f856697ebe1158a55739468f4866d93aa1cbf820891bc64e177cf1dd6ebea81ecf9469578940ee8c7fb9958d686e480cc4f6b0dafd95186eefa67561636c90"' : 'data-bs-target="#xs-components-links-module-TerminalModule-b8f856697ebe1158a55739468f4866d93aa1cbf820891bc64e177cf1dd6ebea81ecf9469578940ee8c7fb9958d686e480cc4f6b0dafd95186eefa67561636c90"' }>
                                            <span class="icon ion-md-cog"></span>
                                            <span>Components</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="components-links-module-TerminalModule-b8f856697ebe1158a55739468f4866d93aa1cbf820891bc64e177cf1dd6ebea81ecf9469578940ee8c7fb9958d686e480cc4f6b0dafd95186eefa67561636c90"' :
                                            'id="xs-components-links-module-TerminalModule-b8f856697ebe1158a55739468f4866d93aa1cbf820891bc64e177cf1dd6ebea81ecf9469578940ee8c7fb9958d686e480cc4f6b0dafd95186eefa67561636c90"' }>
                                            <li class="link">
                                                <a href="components/TerminalComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >TerminalComponent</a>
                                            </li>
                                        </ul>
                                    </li>
                            </li>
                </ul>
                </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#classes-links"' :
                            'data-bs-target="#xs-classes-links"' }>
                            <span class="icon ion-ios-paper"></span>
                            <span>Classes</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="classes-links"' : 'id="xs-classes-links"' }>
                            <li class="link">
                                <a href="classes/AppDB.html" data-type="entity-link" >AppDB</a>
                            </li>
                            <li class="link">
                                <a href="classes/Dir.html" data-type="entity-link" >Dir</a>
                            </li>
                        </ul>
                    </li>
                        <li class="chapter">
                            <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#injectables-links"' :
                                'data-bs-target="#xs-injectables-links"' }>
                                <span class="icon ion-md-arrow-round-down"></span>
                                <span>Injectables</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                            <ul class="links collapse " ${ isNormalMode ? 'id="injectables-links"' : 'id="xs-injectables-links"' }>
                                <li class="link">
                                    <a href="injectables/AddService.html" data-type="entity-link" >AddService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/CoreService.html" data-type="entity-link" >CoreService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/DatabaseService.html" data-type="entity-link" >DatabaseService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/DebugService.html" data-type="entity-link" >DebugService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/FindService.html" data-type="entity-link" >FindService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/GetService.html" data-type="entity-link" >GetService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/MathService.html" data-type="entity-link" >MathService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/QueryService.html" data-type="entity-link" >QueryService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/RemoveService.html" data-type="entity-link" >RemoveService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/TerminalService.html" data-type="entity-link" >TerminalService</a>
                                </li>
                            </ul>
                        </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#interfaces-links"' :
                            'data-bs-target="#xs-interfaces-links"' }>
                            <span class="icon ion-md-information-circle-outline"></span>
                            <span>Interfaces</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? ' id="interfaces-links"' : 'id="xs-interfaces-links"' }>
                            <li class="link">
                                <a href="interfaces/Card.html" data-type="entity-link" >Card</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/CardSPEC.html" data-type="entity-link" >CardSPEC</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Command.html" data-type="entity-link" >Command</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Dir.html" data-type="entity-link" >Dir</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Directory.html" data-type="entity-link" >Directory</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ITX.html" data-type="entity-link" >ITX</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Row.html" data-type="entity-link" >Row</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#miscellaneous-links"'
                            : 'data-bs-target="#xs-miscellaneous-links"' }>
                            <span class="icon ion-ios-cube"></span>
                            <span>Miscellaneous</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="miscellaneous-links"' : 'id="xs-miscellaneous-links"' }>
                            <li class="link">
                                <a href="miscellaneous/functions.html" data-type="entity-link">Functions</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/variables.html" data-type="entity-link">Variables</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <a data-type="chapter-link" href="coverage.html"><span class="icon ion-ios-stats"></span>Documentation coverage</a>
                    </li>
                    <li class="divider"></li>
                    <li class="copyright">
                        Documentation generated using <a href="https://compodoc.app/" target="_blank" rel="noopener noreferrer">
                            <img data-src="images/compodoc-vectorise.png" class="img-responsive" data-type="compodoc-logo">
                        </a>
                    </li>
            </ul>
        </nav>
        `);
        this.innerHTML = tp.strings;
    }
});