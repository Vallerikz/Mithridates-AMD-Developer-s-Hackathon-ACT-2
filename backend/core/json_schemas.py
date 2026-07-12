post_video_summary_schema = {
    'type': 'object',
    'properties': {
        'action': {
            'type': 'string',
            'enum': ['generate', 'update']
        }
    },
    'required': ['action']
}
