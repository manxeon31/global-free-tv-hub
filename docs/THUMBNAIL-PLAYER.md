# Thumbnail playback

Playable channel thumbnails now load the official provider player inside their own card. The visitor presses Play in the provider's video controls. Expand player below the video enlarges that same card across the grid; Back to thumbnail restores its size. The iframe stays in place throughout resizing, preserving playback. Provider fullscreen controls remain available. Cross-origin player clicks belong to the broadcaster, so Atlas uses a separate unobscured expansion control instead of placing an interception layer over the video.

Only one player is mounted at a time. Switching channels destroys the old player; Stop unloads it and returns focus to the thumbnail. Filtering out the active card stops it. Saving a channel or changing filters while retaining the active card does not rebuild or reparent its iframe. News updates remain independent. Escape collapses an expanded card when focus is in the Atlas page; native provider fullscreen handles its own Escape behavior.

Inactive cards retain the compact logo thumbnail. An active small player has a minimum 200px height to respect YouTube's embedded-player minimum viewport. Expanded video uses available page width and a bounded height. Controls are below the video and do not obscure provider controls or advertisements. Non-embeddable stations open their official source.
