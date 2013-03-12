var permissions = AD.Permissions;
 
////
//// Additional installation steps for appRAD module
////

var createRoles = function(callback)
{
    permissions.createRoles([
        'Developer',
        'Translator'
    ], callback);
}


var createTasks = function(callback)
{
    permissions.createTasks([
        { task_key: 'appRAD.exportLabels', task_label: 'AppRAD: Export Labels', language_code: 'en' },
        { task_key: 'appRAD.importLabels', task_label: 'AppRAD: Import Labels', language_code: 'en' }
    ], callback);
}


var assignTasksToRoles = function(callback)
{
    async.forEach(['Developer', 'Translator'], function(roleLabel, callback) {
        permissions.assignTasksToRole(
            ['appRAD.exportLabels', 'appRAD.importLabels'],
            roleLabel,
            callback
        );
    }, callback);
}


exports.initStack = [
    createRoles,
    createTasks,
    assignTasksToRoles
];

