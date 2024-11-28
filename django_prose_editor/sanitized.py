from copy import deepcopy
from django_prose_editor.fields import ProseEditorField, _actually_empty
import nh3


_allowed_attributes = deepcopy(nh3.ALLOWED_ATTRIBUTES)
_allowed_attributes["*"] = {
    "data-tooltip-text",
    "data-placement",
}
_allowed_tags = nh3.ALLOWED_TAGS | {
    "tooltip",
}


def _nh3_sanitizer():

    return lambda x: _actually_empty(
        nh3.clean(
            x,
            tags=_allowed_tags,
            attributes=_allowed_attributes,
        )
    )


class SanitizedProseEditorField(ProseEditorField):
    def __init__(self, *args, **kwargs):
        if "sanitize" not in kwargs:
            kwargs["sanitize"] = _nh3_sanitizer()
        super().__init__(*args, **kwargs)
